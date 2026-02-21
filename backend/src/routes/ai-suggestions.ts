import { FastifyInstance } from "fastify";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { db } from "../services/firebase.js";
import { AISuggestion } from "../types/index.js";
import { generateWithOpenAI } from "../services/openai.js";

export async function aiSuggestionsRoutes(fastify: FastifyInstance) {
  // List active suggestions
  fastify.get(
    "/suggestions",
    { preHandler: [authenticate, requireOrgMembership as any] },
    async (request, reply) => {
      const { orgId } = request.params as { orgId: string };

      const snapshot = await db
        .aiSuggestions(orgId)
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

      const suggestions = snapshot.docs.map((doc) => doc.data() as AISuggestion);

      return reply.send({
        success: true,
        data: { suggestions },
      });
    }
  );

  // Dismiss a suggestion
  fastify.post(
    "/suggestions/:id/dismiss",
    { preHandler: [authenticate, requireOrgMembership as any] },
    async (request, reply) => {
      const { orgId, id } = request.params as { orgId: string; id: string };

      const docRef = db.aiSuggestion(orgId, id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return reply.status(404).send({
          success: false,
          error: "Suggestion not found",
        });
      }

      await docRef.update({ status: "dismissed" });

      return reply.send({
        success: true,
        data: { id, status: "dismissed" },
      });
    }
  );

  // Apply a suggestion
  fastify.post(
    "/suggestions/:id/apply",
    { preHandler: [authenticate, requireOrgMembership as any] },
    async (request, reply) => {
      const { orgId, id } = request.params as { orgId: string; id: string };

      const docRef = db.aiSuggestion(orgId, id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return reply.status(404).send({
          success: false,
          error: "Suggestion not found",
        });
      }

      await docRef.update({ status: "applied" });

      return reply.send({
        success: true,
        data: { id, status: "applied" },
      });
    }
  );

  // AI-powered schedule suggestions for content calendar
  fastify.post(
    "/suggest-schedule",
    { preHandler: [authenticate, requireOrgMembership as any] },
    async (request, reply) => {
      const { orgId } = request.params as { orgId: string };

      // Get draft posts that need scheduling
      const draftsSnapshot = await db
        .posts(orgId)
        .where("status", "==", "draft")
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();

      const drafts = draftsSnapshot.docs.map((doc) => ({
        id: doc.id,
        content: (doc.data().content || "").substring(0, 100),
      }));

      // Get published posts to understand patterns
      const publishedSnapshot = await db
        .posts(orgId)
        .where("status", "==", "published")
        .orderBy("publishedAt", "desc")
        .limit(20)
        .get();

      const publishedTimes = publishedSnapshot.docs.map((doc) => {
        const data = doc.data();
        return data.publishedAt?.toDate?.()?.toISOString() || "";
      });

      const prompt = `Based on publishing patterns and draft content, suggest optimal scheduling.

Draft posts waiting to be scheduled:
${JSON.stringify(drafts, null, 2)}

Recent publishing times:
${JSON.stringify(publishedTimes.slice(0, 10), null, 2)}

For each draft, suggest an optimal day and time to publish. Consider:
- Spacing posts evenly
- Optimal engagement times for social media
- Content type appropriateness for time of day

Respond in JSON format:
[
  {
    "postId": "id",
    "suggestedTime": "ISO 8601 datetime",
    "reason": "Why this time is optimal"
  }
]

Return only valid JSON array.`;

      const response = await generateWithOpenAI(prompt, { temperature: 0.4, maxTokens: 1000 });

      let schedule: Array<{ postId: string; suggestedTime: string; reason: string }>;
      try {
        schedule = JSON.parse(response);
      } catch {
        schedule = [];
      }

      return reply.send({
        success: true,
        data: { schedule },
      });
    }
  );
}
