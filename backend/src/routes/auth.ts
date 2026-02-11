import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { db } from "../services/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { User, PlanTier } from "../types/index.js";

const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional(),
  photoURL: z.string().url().nullable().optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Get current user profile
  fastify.get(
    "/me",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.uid;

      try {
        const userDoc = await db.user(userId).get();

        if (!userDoc.exists) {
          // Create user profile if it doesn't exist
          const newUser: Omit<User, "id"> = {
            email: request.user!.email,
            displayName: null,
            photoURL: null,
            planTier: "free" as PlanTier,
            createdAt: Timestamp.now(),
          };

          await db.user(userId).set(newUser);

          return reply.send({
            success: true,
            data: { id: userId, ...newUser },
          });
        }

        return reply.send({
          success: true,
          data: { id: userDoc.id, ...userDoc.data() },
        });
      } catch (error) {
        request.log.error(error, "Error fetching user profile");
        return reply.status(500).send({
          success: false,
          error: "Failed to fetch user profile",
        });
      }
    }
  );

  // Update user profile
  fastify.put(
    "/profile",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.uid;
      const { displayName, photoURL } = validateBody(updateProfileSchema, request.body);

      try {
        const updateData: Partial<User> = {};
        if (displayName !== undefined) updateData.displayName = displayName;
        if (photoURL !== undefined) updateData.photoURL = photoURL;

        await db.user(userId).update(updateData);

        const updatedDoc = await db.user(userId).get();

        return reply.send({
          success: true,
          data: { id: updatedDoc.id, ...updatedDoc.data() },
        });
      } catch (error) {
        request.log.error(error, "Error updating user profile");
        return reply.status(500).send({
          success: false,
          error: "Failed to update user profile",
        });
      }
    }
  );
}
