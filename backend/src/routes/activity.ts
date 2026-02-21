import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { db } from "../services/firebase.js";

const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  resourceType: z.enum(["post", "account", "organization", "member", "settings", "billing"]).optional(),
});

export async function activityRoutes(fastify: FastifyInstance) {
  // GET / - paginated activity log
  fastify.get<{
    Params: { orgId: string };
    Querystring: { limit?: number; offset?: number; resourceType?: string };
  }>(
    "/",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { limit, offset, resourceType } = validateBody(activityQuerySchema, request.query);

      let query: FirebaseFirestore.Query = db
        .activityLog(orgId)
        .orderBy("createdAt", "desc");

      if (resourceType) {
        query = query.where("resourceType", "==", resourceType);
      }

      const snapshot = await query.limit(limit).offset(offset).get();

      const entries = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          userDisplayName: data.userDisplayName,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          details: data.details,
          metadata: data.metadata,
          createdAt: data.createdAt?.toDate?.()
            ? data.createdAt.toDate().toISOString()
            : data.createdAt,
        };
      });

      return reply.send({
        success: true,
        data: entries,
      });
    }
  );
}
