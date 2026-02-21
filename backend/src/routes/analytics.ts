import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { createError } from "../middleware/errorHandler.js";
import { db } from "../services/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import {
  getAnalyticsOverview,
  getTopPosts,
  getAccountAnalytics,
  getPostAnalytics,
  syncAccountAnalytics,
  syncPostAnalytics,
  aggregateDailyAnalytics,
} from "../services/analyticsService.js";
import {
  analyzeAnalyticsTrends,
  generatePerformanceReport,
} from "../services/openai.js";
import { DailyMetrics } from "../types/index.js";

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
});

const topPostsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sortBy: z.enum(["engagements", "impressions", "engagementRate"]).default("engagements"),
});

const demographicsQuerySchema = z.object({
  accountId: z.string().min(1).optional(),
});

const aiInsightsSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function analyticsRoutes(fastify: FastifyInstance) {
  // GET /overview - aggregated overview
  fastify.get<{
    Params: { orgId: string };
    Querystring: { startDate: string; endDate: string };
  }>(
    "/overview",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { startDate, endDate } = validateBody(dateRangeSchema, request.query);

      const overview = await getAnalyticsOverview(orgId, startDate, endDate);

      return reply.send({
        success: true,
        data: overview,
      });
    }
  );

  // GET /daily - daily time-series for charting
  fastify.get<{
    Params: { orgId: string };
    Querystring: { startDate: string; endDate: string };
  }>(
    "/daily",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { startDate, endDate } = validateBody(dateRangeSchema, request.query);

      const snapshot = await db
        .analyticsDaily(orgId)
        .where("date", ">=", startDate)
        .where("date", "<=", endDate)
        .orderBy("date", "asc")
        .get();

      const dailyMetrics = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return reply.send({
        success: true,
        data: dailyMetrics,
      });
    }
  );

  // GET /accounts/:accountId - per-account metrics
  fastify.get<{
    Params: { orgId: string; accountId: string };
    Querystring: { startDate: string; endDate: string };
  }>(
    "/accounts/:accountId",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, accountId } = request.params;
      const { startDate, endDate } = validateBody(dateRangeSchema, request.query);

      // Verify account exists
      const accountDoc = await db.socialAccount(orgId, accountId).get();
      if (!accountDoc.exists) {
        throw createError("Account not found", 404);
      }

      const analytics = await getAccountAnalytics(
        orgId,
        accountId,
        startDate,
        endDate
      );

      return reply.send({
        success: true,
        data: analytics,
      });
    }
  );

  // GET /posts/:postId - per-post analytics snapshots
  fastify.get<{
    Params: { orgId: string; postId: string };
  }>(
    "/posts/:postId",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, postId } = request.params;

      // Verify post exists
      const postDoc = await db.post(orgId, postId).get();
      if (!postDoc.exists) {
        throw createError("Post not found", 404);
      }

      const snapshots = await getPostAnalytics(orgId, postId);

      return reply.send({
        success: true,
        data: snapshots,
      });
    }
  );

  // GET /top-posts - ranked posts
  fastify.get<{
    Params: { orgId: string };
    Querystring: {
      startDate: string;
      endDate: string;
      limit?: number;
      sortBy?: string;
    };
  }>(
    "/top-posts",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { startDate, endDate, limit, sortBy } = validateBody(
        topPostsQuerySchema,
        request.query
      );

      const topPosts = await getTopPosts(
        orgId,
        startDate,
        endDate,
        limit,
        sortBy
      );

      // Serialize Timestamps in publishedAt
      const serialized = topPosts.map((p) => ({
        ...p,
        publishedAt:
          p.publishedAt && typeof p.publishedAt === "object" && "toDate" in p.publishedAt
            ? (p.publishedAt as { toDate(): Date }).toDate().toISOString()
            : p.publishedAt,
      }));

      return reply.send({
        success: true,
        data: serialized,
      });
    }
  );

  // GET /demographics - audience breakdowns
  fastify.get<{
    Params: { orgId: string };
    Querystring: { accountId?: string };
  }>(
    "/demographics",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { accountId } = validateBody(demographicsQuerySchema, request.query);

      // Demographics are typically fetched from the platform APIs.
      // For now, return stored demographics or a placeholder structure.
      // In a full implementation, this would call platform-specific demographics endpoints.
      const demographics = {
        ageGroups: [] as { group: string; percentage: number }[],
        genderSplit: [] as { gender: string; percentage: number }[],
        topCountries: [] as { country: string; percentage: number }[],
        topCities: [] as { city: string; percentage: number }[],
      };

      return reply.send({
        success: true,
        data: demographics,
      });
    }
  );

  // POST /sync - manual sync trigger (rate limited to 1/hour)
  fastify.post<{
    Params: { orgId: string };
  }>(
    "/sync",
    {
      preHandler: [authenticate, requireOrgMembership],
      config: { rateLimit: { max: 1, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      const { orgId } = request.params;
      const today = new Date().toISOString().split("T")[0];

      // Sync all accounts
      const accountsSnapshot = await db.socialAccounts(orgId).get();
      const results: { accountId: string; status: string }[] = [];

      for (const accountDoc of accountsSnapshot.docs) {
        try {
          await syncAccountAnalytics(orgId, accountDoc.id);
          results.push({ accountId: accountDoc.id, status: "success" });
        } catch (error) {
          results.push({
            accountId: accountDoc.id,
            status: `failed: ${(error as Error).message}`,
          });
        }
      }

      // Sync published posts
      const postsSnapshot = await db
        .posts(orgId)
        .where("status", "==", "published")
        .get();

      for (const postDoc of postsSnapshot.docs) {
        try {
          await syncPostAnalytics(orgId, postDoc.id);
        } catch {
          // Errors already logged per-post; continue
        }
      }

      // Aggregate daily
      try {
        await aggregateDailyAnalytics(orgId, today);
      } catch {
        // Non-fatal; aggregation can be retried
      }

      return reply.send({
        success: true,
        data: { syncedAt: new Date().toISOString(), accounts: results },
        message: "Analytics sync triggered",
      });
    }
  );

  // POST /ai-insights - send data to OpenAI for trend analysis
  fastify.post<{
    Params: { orgId: string };
  }>(
    "/ai-insights",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { startDate, endDate } = validateBody(aiInsightsSchema, request.body);

      // Gather data for AI analysis
      const overview = await getAnalyticsOverview(orgId, startDate, endDate);
      const topPosts = await getTopPosts(orgId, startDate, endDate, 10, "engagements");

      // Get daily metrics for trend analysis
      const dailySnapshot = await db
        .analyticsDaily(orgId)
        .where("date", ">=", startDate)
        .where("date", "<=", endDate)
        .orderBy("date", "asc")
        .get();

      const dailyMetrics = dailySnapshot.docs.map((doc) => doc.data());

      // Analyze trends with AI
      const trends = await analyzeAnalyticsTrends(
        {
          dailyMetrics,
          totalFollowers: overview.totalFollowers,
          engagementRate: overview.engagementRate,
        },
        topPosts.map((p) => ({
          content: p.content,
          engagements: p.engagements,
          impressions: p.impressions,
        }))
      );

      // Generate report
      const report = await generatePerformanceReport(
        overview as unknown as Record<string, unknown>,
        topPosts.map((p) => ({
          content: p.content,
          engagements: p.engagements,
          impressions: p.impressions,
        }))
      );

      return reply.send({
        success: true,
        data: {
          ...trends,
          report,
          period: { start: startDate, end: endDate },
        },
      });
    }
  );
}
