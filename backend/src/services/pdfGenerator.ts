import PDFDocument from "pdfkit";
import { db } from "./firebase.js";
import { DailyMetrics } from "../types/index.js";

interface ReportSections {
  overview?: boolean;
  platforms?: boolean;
  topPosts?: boolean;
  demographics?: boolean;
  aiInsights?: boolean;
}

const COLORS = {
  bg: "#0f172a",
  cardBg: "#1e293b",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  primary: "#3b82f6",
  accent: "#8b5cf6",
  border: "#334155",
  white: "#ffffff",
};

function drawHeader(doc: any, title: string, subtitle: string) {
  doc
    .rect(0, 0, doc.page.width, 80)
    .fill(COLORS.cardBg);

  doc
    .font("Helvetica-Bold")
    .fontSize(24)
    .fillColor(COLORS.white)
    .text(title, 40, 20);

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(COLORS.textMuted)
    .text(subtitle, 40, 50);
}

function drawSectionTitle(doc: any, title: string) {
  const y = doc.y + 20;
  if (y > doc.page.height - 100) {
    doc.addPage();
  }
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.primary)
    .text(title, 40, doc.y + 20);
  doc.moveDown(0.5);
}

function drawMetricRow(
  doc: any,
  label: string,
  value: string | number
) {
  const y = doc.y;
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.textMuted)
    .text(label, 50, y, { width: 200 });
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(String(value), 260, y, { width: 200 });
  doc.moveDown(0.3);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export async function generateAnalyticsReport(
  orgId: string,
  startDate: string,
  endDate: string,
  sections: ReportSections
): Promise<Buffer> {
  // Fetch daily analytics
  const dailySnapshot = await db
    .analyticsDaily(orgId)
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .orderBy("date", "asc")
    .get();

  const dailyMetrics = dailySnapshot.docs.map((doc) => doc.data() as DailyMetrics);

  // Aggregate totals
  const totals = {
    impressions: 0,
    reach: 0,
    engagements: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    videoViews: 0,
    followers: 0,
  };

  for (const d of dailyMetrics) {
    totals.impressions += d.impressions ?? 0;
    totals.reach += d.reach ?? 0;
    totals.engagements += d.engagements ?? 0;
    totals.likes += d.likes ?? 0;
    totals.comments += d.comments ?? 0;
    totals.shares += d.shares ?? 0;
    totals.saves += d.saves ?? 0;
    totals.videoViews += d.videoViews ?? 0;
  }

  if (dailyMetrics.length > 0) {
    totals.followers = dailyMetrics[dailyMetrics.length - 1].followers ?? 0;
  }

  const avgEngagementRate =
    dailyMetrics.length > 0
      ? dailyMetrics.reduce((sum, d) => sum + (d.engagementRate ?? 0), 0) / dailyMetrics.length
      : 0;

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      bufferPages: true,
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);

    // Header
    drawHeader(
      doc,
      "Analytics Report",
      `${startDate} to ${endDate} | Generated ${new Date().toISOString().split("T")[0]}`
    );

    doc.y = 100;

    // Overview Section
    if (sections.overview !== false) {
      drawSectionTitle(doc, "Overview");

      drawMetricRow(doc, "Total Impressions", formatNumber(totals.impressions));
      drawMetricRow(doc, "Total Reach", formatNumber(totals.reach));
      drawMetricRow(doc, "Total Engagements", formatNumber(totals.engagements));
      drawMetricRow(doc, "Total Likes", formatNumber(totals.likes));
      drawMetricRow(doc, "Total Comments", formatNumber(totals.comments));
      drawMetricRow(doc, "Total Shares", formatNumber(totals.shares));
      drawMetricRow(doc, "Total Saves", formatNumber(totals.saves));
      drawMetricRow(doc, "Total Video Views", formatNumber(totals.videoViews));
      drawMetricRow(doc, "Current Followers", formatNumber(totals.followers));
      drawMetricRow(doc, "Avg Engagement Rate", `${avgEngagementRate.toFixed(2)}%`);
      drawMetricRow(doc, "Days in Period", String(dailyMetrics.length));
    }

    // Platforms Section
    if (sections.platforms !== false) {
      drawSectionTitle(doc, "Platform Breakdown");

      const platformTotals: Record<string, Record<string, number>> = {};
      for (const d of dailyMetrics) {
        if (!d.platformBreakdown) continue;
        for (const [platform, metrics] of Object.entries(d.platformBreakdown)) {
          if (!platformTotals[platform]) {
            platformTotals[platform] = { impressions: 0, reach: 0, engagements: 0, likes: 0 };
          }
          const pb = metrics as unknown as Record<string, number>;
          platformTotals[platform].impressions += pb.impressions ?? 0;
          platformTotals[platform].reach += pb.reach ?? 0;
          platformTotals[platform].engagements += pb.engagements ?? 0;
          platformTotals[platform].likes += pb.likes ?? 0;
        }
      }

      for (const [platform, pt] of Object.entries(platformTotals)) {
        doc
          .font("Helvetica-Bold")
          .fontSize(12)
          .fillColor(COLORS.accent)
          .text(platform.charAt(0).toUpperCase() + platform.slice(1), 50, doc.y + 10);
        doc.moveDown(0.3);

        drawMetricRow(doc, "  Impressions", formatNumber(pt.impressions));
        drawMetricRow(doc, "  Reach", formatNumber(pt.reach));
        drawMetricRow(doc, "  Engagements", formatNumber(pt.engagements));
        drawMetricRow(doc, "  Likes", formatNumber(pt.likes));
      }
    }

    // Top Posts Section
    if (sections.topPosts !== false) {
      drawSectionTitle(doc, "Top Posts by Engagement");

      // Sort daily metrics' associated posts (simplified — we pull from posts collection)
      const topPostsData = dailyMetrics
        .filter((d) => d.engagements > 0)
        .sort((a, b) => b.engagements - a.engagements)
        .slice(0, 10);

      if (topPostsData.length === 0) {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(COLORS.textMuted)
          .text("No engagement data available for this period.", 50);
      } else {
        // Table header
        const tableY = doc.y + 5;
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor(COLORS.textMuted);
        doc.text("Date", 50, tableY, { width: 100 });
        doc.text("Impressions", 150, tableY, { width: 100 });
        doc.text("Engagements", 260, tableY, { width: 100 });
        doc.text("Eng. Rate", 370, tableY, { width: 100 });
        doc.moveDown(0.5);

        for (const entry of topPostsData) {
          const y = doc.y;
          if (y > doc.page.height - 60) {
            doc.addPage();
            doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.bg);
          }
          doc
            .font("Helvetica")
            .fontSize(9)
            .fillColor(COLORS.text);
          doc.text(entry.date, 50, doc.y, { width: 100 });
          doc.text(formatNumber(entry.impressions), 150, doc.y - doc.currentLineHeight(), { width: 100 });
          doc.text(formatNumber(entry.engagements), 260, doc.y - doc.currentLineHeight(), { width: 100 });
          doc.text(`${(entry.engagementRate ?? 0).toFixed(2)}%`, 370, doc.y - doc.currentLineHeight(), { width: 100 });
          doc.moveDown(0.3);
        }
      }
    }

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.textMuted)
        .text(
          `Socially Analytics Report | Page ${i + 1} of ${pageCount}`,
          40,
          doc.page.height - 30,
          { align: "center", width: doc.page.width - 80 }
        );
    }

    doc.end();
  });
}
