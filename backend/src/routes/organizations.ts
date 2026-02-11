import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { db } from "../services/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { Organization } from "../types/index.js";
import { createError } from "../middleware/errorHandler.js";

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(100).transform((s) => s.trim()),
});

export async function organizationRoutes(fastify: FastifyInstance) {
  // List user's organizations
  fastify.get(
    "/",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.uid;

      try {
        // Get organizations where user is owner
        const ownedOrgs = await db.organizations()
          .where("ownerId", "==", userId)
          .get();

        // Get organizations where user is a member
        const memberOrgs = await db.organizations()
          .where("members", "array-contains-any", [
            { userId, role: "admin" },
            { userId, role: "editor" },
            { userId, role: "viewer" },
          ])
          .get();

        const organizations: Organization[] = [];
        const seenIds = new Set<string>();

        ownedOrgs.forEach((doc) => {
          if (!seenIds.has(doc.id)) {
            organizations.push({ id: doc.id, ...doc.data() } as Organization);
            seenIds.add(doc.id);
          }
        });

        memberOrgs.forEach((doc) => {
          if (!seenIds.has(doc.id)) {
            organizations.push({ id: doc.id, ...doc.data() } as Organization);
            seenIds.add(doc.id);
          }
        });

        return reply.send({
          success: true,
          data: organizations,
        });
      } catch (error) {
        request.log.error(error, "Error listing organizations");
        return reply.status(500).send({
          success: false,
          error: "Failed to list organizations",
        });
      }
    }
  );

  // Create organization
  fastify.post(
    "/",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.uid;
      const { name } = validateBody(organizationSchema, request.body);

      try {
        const orgData: Omit<Organization, "id"> = {
          name,
          ownerId: userId,
          members: [],
          createdAt: Timestamp.now(),
        };

        const docRef = await db.organizations().add(orgData);

        return reply.status(201).send({
          success: true,
          data: { id: docRef.id, ...orgData },
        });
      } catch (error) {
        request.log.error(error, "Error creating organization");
        return reply.status(500).send({
          success: false,
          error: "Failed to create organization",
        });
      }
    }
  );

  // Get organization by ID
  fastify.get<{
    Params: { id: string };
  }>(
    "/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.uid;

      try {
        const orgDoc = await db.organization(id).get();

        if (!orgDoc.exists) {
          throw createError("Organization not found", 404);
        }

        const orgData = orgDoc.data() as Organization;

        // Check access
        const hasAccess =
          orgData.ownerId === userId ||
          orgData.members.some((m) => m.userId === userId);

        if (!hasAccess) {
          throw createError("Access denied", 403);
        }

        return reply.send({
          success: true,
          data: { ...orgData, id: orgDoc.id },
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error fetching organization");
        return reply.status(500).send({
          success: false,
          error: "Failed to fetch organization",
        });
      }
    }
  );

  // Update organization
  fastify.put<{
    Params: { id: string };
  }>(
    "/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params;
      const { name } = validateBody(organizationSchema, request.body);
      const userId = request.user!.uid;

      try {
        const orgDoc = await db.organization(id).get();

        if (!orgDoc.exists) {
          throw createError("Organization not found", 404);
        }

        const orgData = orgDoc.data() as Organization;

        // Only owner can update
        if (orgData.ownerId !== userId) {
          throw createError("Only the owner can update the organization", 403);
        }

        await db.organization(id).update({ name });

        return reply.send({
          success: true,
          data: { ...orgData, id, name },
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error updating organization");
        return reply.status(500).send({
          success: false,
          error: "Failed to update organization",
        });
      }
    }
  );

  // Delete organization
  fastify.delete<{
    Params: { id: string };
  }>(
    "/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.user!.uid;

      try {
        const orgDoc = await db.organization(id).get();

        if (!orgDoc.exists) {
          throw createError("Organization not found", 404);
        }

        const orgData = orgDoc.data() as Organization;

        // Only owner can delete
        if (orgData.ownerId !== userId) {
          throw createError("Only the owner can delete the organization", 403);
        }

        // Delete all subcollections (accounts, posts)
        const accountsSnapshot = await db.socialAccounts(id).get();
        const postsSnapshot = await db.posts(id).get();

        const batch = db.organizations().firestore.batch();

        accountsSnapshot.forEach((doc) => batch.delete(doc.ref));
        postsSnapshot.forEach((doc) => batch.delete(doc.ref));
        batch.delete(db.organization(id));

        await batch.commit();

        return reply.send({
          success: true,
          message: "Organization deleted successfully",
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error deleting organization");
        return reply.status(500).send({
          success: false,
          error: "Failed to delete organization",
        });
      }
    }
  );
}
