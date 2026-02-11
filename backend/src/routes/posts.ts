import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { db } from "../services/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { Post, PostPlatform, ScheduledJob } from "../types/index.js";
import { createError } from "../middleware/errorHandler.js";
import { publishPost } from "../services/publisher.js";

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
});

const updatePostSchema = z.object({
  content: z.string().max(2200).optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  accountIds: z.array(z.string().min(1)).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
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

      try {
        let query = db.posts(orgId).orderBy("createdAt", "desc");

        if (status) {
          query = query.where("status", "==", status);
        }

        const snapshot = await query.limit(limit).offset(offset).get();

        const posts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        return reply.send({
          success: true,
          data: posts,
        });
      } catch (error) {
        request.log.error(error, "Error listing posts");
        return reply.status(500).send({
          success: false,
          error: "Failed to list posts",
        });
      }
    }
  );

  // Create post
  fastify.post<{
    Params: { orgId: string };
  }>(
    "/",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { content, mediaUrls, scheduledAt, accountIds } = validateBody(createPostSchema, request.body);

      if (!content && mediaUrls.length === 0) {
        throw createError("Content or media is required", 400);
      }

      try {
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

        const docRef = await db.posts(orgId).add(postData);

        // If scheduled, create a scheduled job
        if (isScheduled && scheduledAt) {
          const jobData: Omit<ScheduledJob, "id"> = {
            postId: docRef.id,
            orgId,
            scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
            status: "pending",
            createdAt: now,
            processedAt: null,
          };
          await db.scheduledJobs().add(jobData);
        }

        return reply.status(201).send({
          success: true,
          data: { id: docRef.id, ...postData },
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error creating post");
        return reply.status(500).send({
          success: false,
          error: "Failed to create post",
        });
      }
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

      try {
        const postDoc = await db.post(orgId, postId).get();

        if (!postDoc.exists) {
          throw createError("Post not found", 404);
        }

        return reply.send({
          success: true,
          data: { id: postDoc.id, ...postDoc.data() },
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error fetching post");
        return reply.status(500).send({
          success: false,
          error: "Failed to fetch post",
        });
      }
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
      const { content, mediaUrls, scheduledAt, accountIds } = validateBody(updatePostSchema, request.body);

      try {
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
          }));
        }

        await db.post(orgId, postId).update(updateData);

        const updatedDoc = await db.post(orgId, postId).get();

        return reply.send({
          success: true,
          data: { id: updatedDoc.id, ...updatedDoc.data() },
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error updating post");
        return reply.status(500).send({
          success: false,
          error: "Failed to update post",
        });
      }
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

      try {
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

        return reply.send({
          success: true,
          message: "Post deleted successfully",
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error deleting post");
        return reply.status(500).send({
          success: false,
          error: "Failed to delete post",
        });
      }
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

      try {
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

        return reply.send({
          success: true,
          message: "Post is being published",
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error publishing post");
        return reply.status(500).send({
          success: false,
          error: "Failed to publish post",
        });
      }
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

      try {
        const postDoc = await db.post(orgId, postId).get();

        if (!postDoc.exists) {
          throw createError("Post not found", 404);
        }

        const postData = postDoc.data() as Post;

        if (postData.status === "published") {
          throw createError("Cannot schedule a published post", 400);
        }

        // Update post
        await db.post(orgId, postId).update({
          status: "scheduled",
          scheduledAt: Timestamp.fromDate(scheduleDate),
          updatedAt: Timestamp.now(),
        });

        // Create or update scheduled job
        const existingJobs = await db.scheduledJobs()
          .where("postId", "==", postId)
          .where("status", "==", "pending")
          .get();

        if (!existingJobs.empty) {
          // Update existing job
          await existingJobs.docs[0].ref.update({
            scheduledAt: Timestamp.fromDate(scheduleDate),
          });
        } else {
          // Create new job
          const jobData: Omit<ScheduledJob, "id"> = {
            postId,
            orgId,
            scheduledAt: Timestamp.fromDate(scheduleDate),
            status: "pending",
            createdAt: Timestamp.now(),
            processedAt: null,
          };
          await db.scheduledJobs().add(jobData);
        }

        return reply.send({
          success: true,
          message: "Post scheduled successfully",
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error scheduling post");
        return reply.status(500).send({
          success: false,
          error: "Failed to schedule post",
        });
      }
    }
  );
}
