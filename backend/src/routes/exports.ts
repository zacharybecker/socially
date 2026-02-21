import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { generateAnalyticsCSV, generatePostsCSV, generateAccountCSV } from "../services/csvGenerator.js";
import { generateAnalyticsReport } from "../services/pdfGenerator.js";
import { generateAnalyticsExcel } from "../services/excelGenerator.js";
import { createError } from "../middleware/errorHandler.js";
import { db } from "../services/firebase.js";

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
});

const postsExportSchema = z.object({
  status: z.enum(["draft", "scheduled", "publishing", "published", "failed", "pending_approval", "approved", "rejected"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const pdfReportSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"),
  sections: z.array(z.enum(["overview", "platforms", "topPosts", "demographics", "aiInsights"])).default(["overview", "platforms", "topPosts"]),
});

export async function exportRoutes(fastify: FastifyInstance) {
  // GET /analytics/csv
  fastify.get<{
    Params: { orgId: string };
    Querystring: { startDate: string; endDate: string };
  }>(
    "/analytics/csv",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { startDate, endDate } = validateBody(dateRangeSchema, request.query);

      const csv = await generateAnalyticsCSV(orgId, startDate, endDate);

      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", `attachment; filename="analytics_${startDate}_${endDate}.csv"`)
        .send(csv);
    }
  );

  // GET /analytics/xlsx
  fastify.get<{
    Params: { orgId: string };
    Querystring: { startDate: string; endDate: string };
  }>(
    "/analytics/xlsx",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { startDate, endDate } = validateBody(dateRangeSchema, request.query);

      const buffer = await generateAnalyticsExcel(orgId, startDate, endDate);

      return reply
        .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .header("Content-Disposition", `attachment; filename="analytics_${startDate}_${endDate}.xlsx"`)
        .send(buffer);
    }
  );

  // POST /report/pdf
  fastify.post<{
    Params: { orgId: string };
  }>(
    "/report/pdf",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { startDate, endDate, sections } = validateBody(pdfReportSchema, request.body);

      const sectionFlags: Record<string, boolean> = {};
      for (const s of sections) {
        sectionFlags[s] = true;
      }

      const buffer = await generateAnalyticsReport(orgId, startDate, endDate, sectionFlags);

      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", `attachment; filename="report_${startDate}_${endDate}.pdf"`)
        .send(buffer);
    }
  );

  // GET /posts/csv
  fastify.get<{
    Params: { orgId: string };
    Querystring: { status?: string; startDate?: string; endDate?: string };
  }>(
    "/posts/csv",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;
      const { status, startDate, endDate } = validateBody(postsExportSchema, request.query);

      const csv = await generatePostsCSV(orgId, status, startDate, endDate);

      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", `attachment; filename="posts_export.csv"`)
        .send(csv);
    }
  );

  // GET /accounts/:accountId/csv
  fastify.get<{
    Params: { orgId: string; accountId: string };
    Querystring: { startDate: string; endDate: string };
  }>(
    "/accounts/:accountId/csv",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, accountId } = request.params;
      const { startDate, endDate } = validateBody(dateRangeSchema, request.query);

      // Verify account exists
      const accountDoc = await db.socialAccount(orgId, accountId).get();
      if (!accountDoc.exists) {
        throw createError("Account not found", 404);
      }

      const csv = await generateAccountCSV(orgId, accountId, startDate, endDate);

      return reply
        .header("Content-Type", "text/csv")
        .header("Content-Disposition", `attachment; filename="account_${accountId}_${startDate}_${endDate}.csv"`)
        .send(csv);
    }
  );
}
