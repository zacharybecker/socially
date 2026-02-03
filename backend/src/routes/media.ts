import { FastifyInstance } from "fastify";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { getStorage } from "../services/firebase.js";
import { createError } from "../middleware/errorHandler.js";
import { randomUUID } from "crypto";

export async function mediaRoutes(fastify: FastifyInstance) {
  // Upload media
  fastify.post<{
    Params: { orgId: string };
  }>(
    "/upload",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;

      try {
        const data = await request.file();

        if (!data) {
          throw createError("No file uploaded", 400);
        }

        const allowedMimeTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "video/mp4",
          "video/quicktime",
          "video/webm",
        ];

        if (!allowedMimeTypes.includes(data.mimetype)) {
          throw createError(
            "Invalid file type. Allowed: JPEG, PNG, GIF, WebP, MP4, MOV, WebM",
            400
          );
        }

        const fileId = randomUUID();
        const extension = data.filename.split(".").pop() || "";
        const filename = `${orgId}/${fileId}.${extension}`;

        const bucket = getStorage().bucket();
        const file = bucket.file(filename);

        // Read file buffer
        const chunks: Buffer[] = [];
        for await (const chunk of data.file) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // Upload to Firebase Storage
        await file.save(buffer, {
          metadata: {
            contentType: data.mimetype,
            metadata: {
              uploadedBy: request.user!.uid,
              orgId,
            },
          },
        });

        // Make file publicly accessible
        await file.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

        return reply.send({
          success: true,
          data: {
            id: fileId,
            url: publicUrl,
            type: data.mimetype.startsWith("image/") ? "image" : "video",
            filename: data.filename,
            size: buffer.length,
          },
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error uploading media");
        return reply.status(500).send({
          success: false,
          error: "Failed to upload media",
        });
      }
    }
  );

  // Delete media
  fastify.delete<{
    Params: { orgId: string; mediaId: string };
  }>(
    "/:mediaId",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, mediaId } = request.params;

      try {
        const bucket = getStorage().bucket();

        // List files with the mediaId prefix in the org folder
        const [files] = await bucket.getFiles({
          prefix: `${orgId}/${mediaId}`,
        });

        if (files.length === 0) {
          throw createError("Media not found", 404);
        }

        // Delete all matching files
        await Promise.all(files.map((file) => file.delete()));

        return reply.send({
          success: true,
          message: "Media deleted successfully",
        });
      } catch (error) {
        if ((error as { statusCode?: number }).statusCode) {
          throw error;
        }
        request.log.error(error, "Error deleting media");
        return reply.status(500).send({
          success: false,
          error: "Failed to delete media",
        });
      }
    }
  );
}
