import dotenv from "dotenv";
// Load environment variables FIRST, before any other imports that might use them
dotenv.config();

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import cookie from "@fastify/cookie";

import { authRoutes } from "./routes/auth.js";
import { organizationRoutes } from "./routes/organizations.js";
import { accountRoutes } from "./routes/accounts.js";
import { postRoutes } from "./routes/posts.js";
import { mediaRoutes } from "./routes/media.js";
import { aiRoutes } from "./routes/ai.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { billingRoutes } from "./routes/billing.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { brandVoiceRoutes } from "./routes/brand-voice.js";
import { aiSuggestionsRoutes } from "./routes/ai-suggestions.js";
import { exportRoutes } from "./routes/exports.js";
import { memberRoutes } from "./routes/members.js";
import { commentRoutes } from "./routes/comments.js";
import { activityRoutes } from "./routes/activity.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { initializeFirebase } from "./services/firebase.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";

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

    await fastify.register(helmet, {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    });

    await fastify.register(rateLimit, {
      max: 100,
      timeWindow: "1 minute",
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

    // Register webhook routes with raw body parsing for Stripe signature verification.
    // Must use a scoped content type parser so the raw buffer is preserved.
    await fastify.register(async (scope) => {
      scope.addContentTypeParser(
        "application/json",
        { parseAs: "buffer" },
        (req, body, done) => {
          // Store the raw buffer on the request for Stripe signature verification
          (req as unknown as Record<string, unknown>).rawBody = body;
          try {
            done(null, JSON.parse(body.toString()));
          } catch (err) {
            done(err as Error, undefined);
          }
        }
      );
      scope.register(webhookRoutes, { prefix: "/webhooks" });
    });

    // Request logging
    fastify.addHook("onResponse", (request, reply, done) => {
      request.log.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      }, "request completed");
      done();
    });

    // Register routes with per-prefix rate limits
    await fastify.register(async (scope) => {
      scope.addHook("onRoute", (routeOptions) => {
        routeOptions.config = { ...routeOptions.config, rateLimit: { max: 30, timeWindow: "1 minute" } };
      });
      scope.register(authRoutes, { prefix: "/auth" });
    });

    await fastify.register(organizationRoutes, { prefix: "/organizations" });
    await fastify.register(accountRoutes, { prefix: "/organizations/:orgId/accounts" });
    await fastify.register(postRoutes, { prefix: "/organizations/:orgId/posts" });

    await fastify.register(async (scope) => {
      scope.addHook("onRoute", (routeOptions) => {
        routeOptions.config = { ...routeOptions.config, rateLimit: { max: 20, timeWindow: "1 minute" } };
      });
      scope.register(mediaRoutes, { prefix: "/organizations/:orgId/media" });
    });

    await fastify.register(analyticsRoutes, {
      prefix: "/organizations/:orgId/analytics",
    });

    await fastify.register(async (scope) => {
      scope.addHook("onRoute", (routeOptions) => {
        routeOptions.config = { ...routeOptions.config, rateLimit: { max: 10, timeWindow: "1 minute" } };
      });
      scope.register(aiRoutes, { prefix: "/ai" });
    });

    await fastify.register(billingRoutes, { prefix: "/billing" });

    await fastify.register(brandVoiceRoutes, {
      prefix: "/organizations/:orgId/brand-voice",
    });

    await fastify.register(aiSuggestionsRoutes, {
      prefix: "/organizations/:orgId/ai",
    });

    await fastify.register(exportRoutes, {
      prefix: "/organizations/:orgId/exports",
    });

    await fastify.register(memberRoutes, {
      prefix: "/organizations/:orgId/members",
    });

    await fastify.register(commentRoutes, {
      prefix: "/organizations/:orgId/posts/:postId/comments",
    });

    await fastify.register(activityRoutes, {
      prefix: "/organizations/:orgId/activity",
    });

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
    stopScheduler();
    await fastify.close();
    process.exit(0);
  });
});

main();
