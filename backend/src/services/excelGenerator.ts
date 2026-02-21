import ExcelJS from "exceljs";
import { db } from "./firebase.js";
import { DailyMetrics } from "../types/index.js";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1E293B" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFE2E8F0" },
  size: 11,
};

const DATA_FONT: Partial<ExcelJS.Font> = {
  color: { argb: "FFCBD5E1" },
  size: 10,
};

function styleHeaders(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF334155" } },
    };
  });
  headerRow.height = 28;
}

function autoWidth(sheet: ExcelJS.Worksheet) {
  sheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value?.toString().length ?? 0;
      if (len > maxLength) maxLength = len;
    });
    column.width = Math.min(maxLength + 4, 40);
  });
}

export async function generateAnalyticsExcel(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<Buffer> {
  const snapshot = await db
    .analyticsDaily(orgId)
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .orderBy("date", "asc")
    .get();

  const dailyMetrics = snapshot.docs.map((doc) => doc.data() as DailyMetrics);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Socially";
  workbook.created = new Date();

  // Sheet 1: Overview
  const overviewSheet = workbook.addWorksheet("Overview");
  overviewSheet.columns = [
    { header: "Metric", key: "metric" },
    { header: "Value", key: "value" },
  ];

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

  const avgEngRate =
    dailyMetrics.length > 0
      ? dailyMetrics.reduce((s, d) => s + (d.engagementRate ?? 0), 0) / dailyMetrics.length
      : 0;

  overviewSheet.addRows([
    { metric: "Period", value: `${startDate} to ${endDate}` },
    { metric: "Days", value: dailyMetrics.length },
    { metric: "Total Impressions", value: totals.impressions },
    { metric: "Total Reach", value: totals.reach },
    { metric: "Total Engagements", value: totals.engagements },
    { metric: "Total Likes", value: totals.likes },
    { metric: "Total Comments", value: totals.comments },
    { metric: "Total Shares", value: totals.shares },
    { metric: "Total Saves", value: totals.saves },
    { metric: "Total Video Views", value: totals.videoViews },
    { metric: "Current Followers", value: totals.followers },
    { metric: "Avg Engagement Rate", value: `${avgEngRate.toFixed(2)}%` },
  ]);

  styleHeaders(overviewSheet);
  overviewSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.font = DATA_FONT;
      });
    }
  });
  autoWidth(overviewSheet);

  // Sheet 2: Daily
  const dailySheet = workbook.addWorksheet("Daily");
  dailySheet.columns = [
    { header: "Date", key: "date" },
    { header: "Impressions", key: "impressions" },
    { header: "Reach", key: "reach" },
    { header: "Engagements", key: "engagements" },
    { header: "Likes", key: "likes" },
    { header: "Comments", key: "comments" },
    { header: "Shares", key: "shares" },
    { header: "Saves", key: "saves" },
    { header: "Video Views", key: "videoViews" },
    { header: "Followers", key: "followers" },
    { header: "Engagement Rate", key: "engagementRate" },
  ];

  for (const d of dailyMetrics) {
    dailySheet.addRow({
      date: d.date,
      impressions: d.impressions ?? 0,
      reach: d.reach ?? 0,
      engagements: d.engagements ?? 0,
      likes: d.likes ?? 0,
      comments: d.comments ?? 0,
      shares: d.shares ?? 0,
      saves: d.saves ?? 0,
      videoViews: d.videoViews ?? 0,
      followers: d.followers ?? 0,
      engagementRate: d.engagementRate ?? 0,
    });
  }

  styleHeaders(dailySheet);
  dailySheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.font = DATA_FONT;
      });
    }
  });
  autoWidth(dailySheet);

  // Sheet 3: Platform Breakdown
  const platformSheet = workbook.addWorksheet("Platform Breakdown");
  platformSheet.columns = [
    { header: "Date", key: "date" },
    { header: "Platform", key: "platform" },
    { header: "Impressions", key: "impressions" },
    { header: "Reach", key: "reach" },
    { header: "Engagements", key: "engagements" },
    { header: "Likes", key: "likes" },
    { header: "Comments", key: "comments" },
    { header: "Shares", key: "shares" },
    { header: "Saves", key: "saves" },
    { header: "Video Views", key: "videoViews" },
  ];

  for (const d of dailyMetrics) {
    if (!d.platformBreakdown) continue;
    for (const [platform, metrics] of Object.entries(d.platformBreakdown)) {
      const pb = metrics as unknown as Record<string, number>;
      platformSheet.addRow({
        date: d.date,
        platform,
        impressions: pb.impressions ?? 0,
        reach: pb.reach ?? 0,
        engagements: pb.engagements ?? 0,
        likes: pb.likes ?? 0,
        comments: pb.comments ?? 0,
        shares: pb.shares ?? 0,
        saves: pb.saves ?? 0,
        videoViews: pb.videoViews ?? 0,
      });
    }
  }

  styleHeaders(platformSheet);
  platformSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.font = DATA_FONT;
      });
    }
  });
  autoWidth(platformSheet);

  // Sheet 4: Top Posts (by daily engagement, simplified)
  const topSheet = workbook.addWorksheet("Top Posts");
  topSheet.columns = [
    { header: "Date", key: "date" },
    { header: "Impressions", key: "impressions" },
    { header: "Engagements", key: "engagements" },
    { header: "Engagement Rate", key: "engagementRate" },
    { header: "Likes", key: "likes" },
    { header: "Comments", key: "comments" },
    { header: "Shares", key: "shares" },
  ];

  const sorted = [...dailyMetrics]
    .filter((d) => d.engagements > 0)
    .sort((a, b) => b.engagements - a.engagements)
    .slice(0, 20);

  for (const d of sorted) {
    topSheet.addRow({
      date: d.date,
      impressions: d.impressions ?? 0,
      engagements: d.engagements ?? 0,
      engagementRate: d.engagementRate ?? 0,
      likes: d.likes ?? 0,
      comments: d.comments ?? 0,
      shares: d.shares ?? 0,
    });
  }

  styleHeaders(topSheet);
  topSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.font = DATA_FONT;
      });
    }
  });
  autoWidth(topSheet);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
