import dotenv from "dotenv";
// Load environment variables FIRST, before any other imports that might use them
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import cookie from "@fastify/cookie";

import { authRoutes } from "./routes/auth.js";
import { organizationRoutes } from "./routes/organizations.js";
import { accountRoutes } from "./routes/accounts.js";
import { postRoutes } from "./routes/posts.js";
import { mediaRoutes } from "./routes/media.js";
import { aiRoutes } from "./routes/ai.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initializeFirebase } from "./services/firebase.js";
import { startScheduler } from "./jobs/scheduler.js";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          }
        : undefined,
  },
});

async function main() {
  try {
    // Initialize Firebase Admin
    initializeFirebase();

    // Register plugins
    await fastify.register(cors, {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
      },
    });

    await fastify.register(cookie, {
      secret: process.env.COOKIE_SECRET || "your-cookie-secret",
    });

    // Set error handler
    fastify.setErrorHandler(errorHandler);

    // Register routes
    await fastify.register(authRoutes, { prefix: "/auth" });
    await fastify.register(organizationRoutes, { prefix: "/organizations" });
    await fastify.register(accountRoutes, { prefix: "/organizations/:orgId/accounts" });
    await fastify.register(postRoutes, { prefix: "/organizations/:orgId/posts" });
    await fastify.register(mediaRoutes, { prefix: "/organizations/:orgId/media" });
    await fastify.register(aiRoutes, { prefix: "/ai" });

    // Health check
    fastify.get("/health", async () => {
      return { status: "ok", timestamp: new Date().toISOString() };
    });

    // Start the scheduler
    startScheduler();

    // Start server
    const port = parseInt(process.env.PORT || "3001", 10);
    const host = process.env.HOST || "0.0.0.0";

    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on ${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Handle graceful shutdown
const signals = ["SIGINT", "SIGTERM"];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);
    await fastify.close();
    process.exit(0);
  });
});

main();
