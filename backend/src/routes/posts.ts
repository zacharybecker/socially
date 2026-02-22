import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { db } from "../services/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { Post, PostPlatform, ScheduledJob } from "../types/index.js";
import { createError } from "../middleware/errorHandler.js";
import { publishPost } from "../services/publisher.js";
import { requireQuota } from "../middleware/planGuard.js";
import { incrementUsage } from "../services/usage.js";
import { requireRole } from "../middleware/auth.js";
import { logActivity } from "../services/activity-log.js";
import { Organization, ApprovalRequest } from "../types/index.js";

function serializeTimestamps(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== null && typeof val === "object" && "toDate" in val) {
      result[key] = (val as { toDate(): Date }).toDate().toISOString();
    } else {
      result[key] = val;
    }
  }
  return result;
}

const postStatusEnum = z.enum(["draft", "scheduled", "publishing", "published", "failed"]);

const listPostsQuerySchema = z.object({
  status: postStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const createPostSchema = z.object({
  content: z.string().max(2200).default(""),
  mediaUrls: z.array(z.string().url()).max(10).default([]),
  accountIds: z.array(z.string().min(1)).min(1, "At least one account must be selected"),
  scheduledAt: z.string().datetime().nullable().optional(),
  platformMetadata: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

const updatePostSchema = z.object({
  content: z.string().max(2200).optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  accountIds: z.array(z.string().min(1)).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  platformMetadata: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});

const schedulePostSchema = z.object({
  scheduledAt: z.string().datetime({ message: "scheduledAt must be a valid ISO date string" }),
});

export async function postRoutes(fastify: FastifyInstance) {
  // List posts
  fastify.get<{
    Params: { orgId: string };
    Querystring: { status?: string; limit?: number; offset?: number };
  }>(
    "/",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { status, limit, offset } = validateBody(listPostsQuerySchema, request.query);

      let query = db.posts(orgId).orderBy("createdAt", "desc");

      if (status) {
        query = query.where("status", "==", status);
      }

      const snapshot = await query.limit(limit).offset(offset).get();

      const posts = snapshot.docs.map((doc) =>
        serializeTimestamps({ id: doc.id, ...doc.data() })
      );

      return reply.send({
        success: true,
        data: posts,
      });
    }
  );

  // Create post
  fastify.post<{
    Params: { orgId: string };
  }>(
    "/",
    { preHandler: [authenticate, requireOrgMembership, requireQuota("postsCreated")] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { content, mediaUrls, scheduledAt, accountIds, platformMetadata } = validateBody(createPostSchema, request.body);

      if (!content && mediaUrls.length === 0) {
        throw createError("Content or media is required", 400);
      }

      // Verify all accounts exist
      const accountPromises = accountIds.map((id) =>
        db.socialAccount(orgId, id).get()
      );
      const accountDocs = await Promise.all(accountPromises);

      const invalidAccounts = accountDocs.filter((doc) => !doc.exists);
      if (invalidAccounts.length > 0) {
        throw createError("One or more selected accounts not found", 400);
      }

      const platforms: PostPlatform[] = accountIds.map((accountId) => ({
        accountId,
        status: "draft" as const,
        platformPostId: null,
        errorMessage: null,
        metadata: platformMetadata?.[accountId] || null,
      }));

      const now = Timestamp.now();
      const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

      const postData: Omit<Post, "id"> = {
        organizationId: orgId,
        status: isScheduled ? "scheduled" : "draft",
        content: content || "",
        mediaUrls,
        scheduledAt: scheduledAt ? Timestamp.fromDate(new Date(scheduledAt)) : null,
        publishedAt: null,
        createdByUserId: request.user!.uid,
        createdAt: now,
        updatedAt: now,
        platforms,
      };

      // Pre-generate post ID and batch post + job creation for atomicity
      const postRef = db.posts(orgId).doc();
      const batch = db.posts(orgId).firestore.batch();
      batch.set(postRef, postData);

      if (isScheduled && scheduledAt) {
        const jobRef = db.scheduledJobs().doc();
        const jobData: Omit<ScheduledJob, "id"> = {
          postId: postRef.id,
          orgId,
          scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
          status: "pending",
          createdAt: now,
          processedAt: null,
        };
        batch.set(jobRef, jobData);
      }

      await batch.commit();

      await incrementUsage(request.user!.uid, "postsCreated", 1);

      return reply.status(201).send({
        success: true,
        data: serializeTimestamps({ id: postRef.id, ...postData }),
      });
    }
  );

  // Get post by ID
  fastify.get<{
    Params: { orgId: string; postId: string };
  }>(
    "/:postId",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, postId } = request.params;

      const postDoc = await db.post(orgId, postId).get();

      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      return reply.send({
        success: true,
        data: serializeTimestamps({ id: postDoc.id, ...postDoc.data() }),
      });
    }
  );

  // Update post
  fastify.put<{
    Params: { orgId: string; postId: string };
  }>(
    "/:postId",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, postId } = request.params;
      const { content, mediaUrls, scheduledAt, accountIds, platformMetadata } = validateBody(updatePostSchema, request.body);

      const postDoc = await db.post(orgId, postId).get();

      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      const existingPost = postDoc.data() as Post;

      if (existingPost.status === "published") {
        throw createError("Cannot edit a published post", 400);
      }

      const updateData: Partial<Post> = {
        updatedAt: Timestamp.now(),
      };

      if (content !== undefined) updateData.content = content;
      if (mediaUrls !== undefined) updateData.mediaUrls = mediaUrls;
      if (scheduledAt !== undefined) {
        updateData.scheduledAt = scheduledAt
          ? Timestamp.fromDate(new Date(scheduledAt))
          : null;
        updateData.status = scheduledAt ? "scheduled" : "draft";
      }

      if (accountIds !== undefined) {
        updateData.platforms = accountIds.map((accountId) => ({
          accountId,
          status: "draft" as const,
          platformPostId: null,
          errorMessage: null,
          metadata: platformMetadata?.[accountId] || null,
        }));
      }

      await db.post(orgId, postId).update(updateData);

      // Manage scheduled jobs when scheduledAt changes
      if (scheduledAt !== undefined) {
        const existingJobs = await db.scheduledJobs()
          .where("postId", "==", postId)
          .where("status", "==", "pending")
          .get();

        if (scheduledAt) {
          if (!existingJobs.empty) {
            await existingJobs.docs[0].ref.update({
              scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
            });
          } else {
            const jobData: Omit<ScheduledJob, "id"> = {
              postId,
              orgId,
              scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
              status: "pending",
              createdAt: Timestamp.now(),
              processedAt: null,
            };
            await db.scheduledJobs().add(jobData);
          }
        } else {
          const deleteBatch = db.posts(orgId).firestore.batch();
          existingJobs.forEach((doc) => deleteBatch.delete(doc.ref));
          if (!existingJobs.empty) await deleteBatch.commit();
        }
      }

      return reply.send({
        success: true,
        data: serializeTimestamps({ ...existingPost, ...updateData, id: postId }),
      });
    }
  );

  // Delete post
  fastify.delete<{
    Params: { orgId: string; postId: string };
  }>(
    "/:postId",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, postId } = request.params;

      const postDoc = await db.post(orgId, postId).get();

      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      // Delete associated scheduled jobs
      const jobsSnapshot = await db.scheduledJobs()
        .where("postId", "==", postId)
        .where("status", "==", "pending")
        .get();

      const batch = db.posts(orgId).firestore.batch();
      jobsSnapshot.forEach((doc) => batch.delete(doc.ref));
      batch.delete(db.post(orgId, postId));

      await batch.commit();

      request.log.info({ audit: true, event: "post_deleted", orgId, postId }, "Post deleted");

      return reply.send({
        success: true,
        message: "Post deleted successfully",
      });
    }
  );

  // Publish post immediately
  fastify.post<{
    Params: { orgId: string; postId: string };
  }>(
    "/:postId/publish",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, postId } = request.params;

      const postDoc = await db.post(orgId, postId).get();

      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      const postData = postDoc.data() as Post;

      if (postData.status === "published") {
        throw createError("Post is already published", 400);
      }

      if (postData.status === "publishing") {
        throw createError("Post is currently being published", 400);
      }

      // Update status to publishing
      await db.post(orgId, postId).update({
        status: "publishing",
        updatedAt: Timestamp.now(),
      });

      // Publish in background
      publishPost(orgId, postId).catch((error) => {
        request.log.error(error, "Background publish failed");
      });

      request.log.info({ audit: true, event: "post_publish", orgId, postId }, "Post publish initiated");

      return reply.send({
        success: true,
        message: "Post is being published",
      });
    }
  );

  // Schedule post
  fastify.post<{
    Params: { orgId: string; postId: string };
  }>(
    "/:postId/schedule",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, postId } = request.params;
      const { scheduledAt } = validateBody(schedulePostSchema, request.body);

      const scheduleDate = new Date(scheduledAt);
      if (scheduleDate <= new Date()) {
        throw createError("Scheduled time must be in the future", 400);
      }

      const postDoc = await db.post(orgId, postId).get();

      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      const postData = postDoc.data() as Post;

      if (postData.status === "published") {
        throw createError("Cannot schedule a published post", 400);
      }

      // Batch post update + job create/update for atomicity
      const existingJobs = await db.scheduledJobs()
        .where("postId", "==", postId)
        .where("status", "==", "pending")
        .get();

      const batch = db.posts(orgId).firestore.batch();

      batch.update(db.post(orgId, postId), {
        status: "scheduled",
        scheduledAt: Timestamp.fromDate(scheduleDate),
        updatedAt: Timestamp.now(),
      });

      if (!existingJobs.empty) {
        batch.update(existingJobs.docs[0].ref, {
          scheduledAt: Timestamp.fromDate(scheduleDate),
        });
      } else {
        const jobRef = db.scheduledJobs().doc();
        const jobData: Omit<ScheduledJob, "id"> = {
          postId,
          orgId,
          scheduledAt: Timestamp.fromDate(scheduleDate),
          status: "pending",
          createdAt: Timestamp.now(),
          processedAt: null,
        };
        batch.set(jobRef, jobData);
      }

      await batch.commit();

      return reply.send({
        success: true,
        message: "Post scheduled successfully",
      });
    }
  );

  // Submit post for approval
  fastify.post<{
    Params: { orgId: string; postId: string };
  }>(
    "/:postId/submit-for-approval",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, postId } = request.params;

      const postDoc = await db.post(orgId, postId).get();
      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      const postData = postDoc.data() as Post;
      if (postData.status === "published") {
        throw createError("Cannot submit a published post for approval", 400);
      }

      const approvalRequest: ApprovalRequest = {
        requestedBy: request.user!.uid,
        requestedAt: Timestamp.now(),
        reviewedBy: null,
        reviewedAt: null,
        status: "pending",
        comment: null,
      };

      await db.post(orgId, postId).update({
        status: "pending_approval",
        approvalRequest,
        updatedAt: Timestamp.now(),
      });

      await logActivity(orgId, request.user!.uid, "post_submitted_for_approval", "post", postId, "Post submitted for approval");

      return reply.send({
        success: true,
        message: "Post submitted for approval",
      });
    }
  );

  // Approve post
  fastify.post<{
    Params: { orgId: string; postId: string };
  }>(
    "/:postId/approve",
    { preHandler: [authenticate, requireOrgMembership, requireRole("admin")] },
    async (request, reply) => {
      const { orgId, postId } = request.params;
      const body = request.body as { comment?: string } | undefined;

      const postDoc = await db.post(orgId, postId).get();
      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      const postData = postDoc.data() as Post;
      if (postData.status !== "pending_approval") {
        throw createError("Post is not pending approval", 400);
      }

      const approvalRequest: ApprovalRequest = {
        ...(postData.approvalRequest || { requestedBy: "", requestedAt: Timestamp.now() }),
        reviewedBy: request.user!.uid,
        reviewedAt: Timestamp.now(),
        status: "approved",
        comment: body?.comment || null,
      };

      await db.post(orgId, postId).update({
        status: "approved",
        approvalRequest,
        updatedAt: Timestamp.now(),
      });

      await logActivity(orgId, request.user!.uid, "post_approved", "post", postId, "Post approved");

      return reply.send({
        success: true,
        message: "Post approved",
      });
    }
  );

  // Reject post
  fastify.post<{
    Params: { orgId: string; postId: string };
  }>(
    "/:postId/reject",
    { preHandler: [authenticate, requireOrgMembership, requireRole("admin")] },
    async (request, reply) => {
      const { orgId, postId } = request.params;
      const body = request.body as { comment?: string } | undefined;

      const postDoc = await db.post(orgId, postId).get();
      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      const postData = postDoc.data() as Post;
      if (postData.status !== "pending_approval") {
        throw createError("Post is not pending approval", 400);
      }

      if (!body?.comment) {
        throw createError("A comment is required when rejecting a post", 400);
      }

      const approvalRequest: ApprovalRequest = {
        ...(postData.approvalRequest || { requestedBy: "", requestedAt: Timestamp.now() }),
        reviewedBy: request.user!.uid,
        reviewedAt: Timestamp.now(),
        status: "rejected",
        comment: body.comment,
      };

      await db.post(orgId, postId).update({
        status: "rejected",
        approvalRequest,
        updatedAt: Timestamp.now(),
      });

      await logActivity(orgId, request.user!.uid, "post_rejected", "post", postId, `Post rejected: ${body.comment}`);

      return reply.send({
        success: true,
        message: "Post rejected",
      });
    }
  );
}
