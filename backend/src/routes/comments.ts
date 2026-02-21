import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { db } from "../services/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { createError } from "../middleware/errorHandler.js";
import { Comment, Organization } from "../types/index.js";

const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(2000),
});

export async function commentRoutes(fastify: FastifyInstance) {
  // GET / - list comments for a post
  fastify.get<{
    Params: { orgId: string; postId: string };
  }>(
    "/",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, postId } = request.params;

      // Verify post exists
      const postDoc = await db.post(orgId, postId).get();
      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      const snapshot = await db
        .comments(orgId, postId)
        .orderBy("createdAt", "asc")
        .get();

      const comments = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          userDisplayName: data.userDisplayName,
          content: data.content,
          createdAt: data.createdAt?.toDate?.()
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        };
      });

      return reply.send({
        success: true,
        data: comments,
      });
    }
  );

  // POST / - create comment
  fastify.post<{
    Params: { orgId: string; postId: string };
  }>(
    "/",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, postId } = request.params;
      const { content } = validateBody(createCommentSchema, request.body);

      // Verify post exists
      const postDoc = await db.post(orgId, postId).get();
      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      // Get user display name
      const userDoc = await db.user(request.user!.uid).get();
      const userDisplayName = userDoc.exists
        ? userDoc.data()?.displayName || userDoc.data()?.email || "Unknown"
        : "Unknown";

      const commentData: Omit<Comment, "id"> = {
        userId: request.user!.uid,
        userDisplayName,
        content,
        createdAt: Timestamp.now(),
      };

      const commentRef = await db.comments(orgId, postId).add(commentData);

      return reply.status(201).send({
        success: true,
        data: {
          id: commentRef.id,
          ...commentData,
          createdAt: new Date().toISOString(),
        },
      });
    }
  );

  // DELETE /:commentId - delete comment
  fastify.delete<{
    Params: { orgId: string; postId: string; commentId: string };
  }>(
    "/:commentId",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, postId, commentId } = request.params;

      const commentDoc = await db.comment(orgId, postId, commentId).get();
      if (!commentDoc.exists) {
        throw createError("Comment not found", 404);
      }

      const comment = commentDoc.data() as Comment;

      // Only comment author or org owner/admin can delete
      if (comment.userId !== request.user!.uid) {
        const orgDoc = await db.organization(orgId).get();
        const org = orgDoc.data() as Organization;

        const isOwner = org.ownerId === request.user!.uid;
        const isAdmin = (org.members || []).some(
          (m) => m.userId === request.user!.uid && m.role === "admin"
        );

        if (!isOwner && !isAdmin) {
          throw createError("You can only delete your own comments", 403);
        }
      }

      await db.comment(orgId, postId, commentId).delete();

      return reply.send({
        success: true,
        message: "Comment deleted",
      });
    }
  );
}
