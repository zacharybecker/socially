import { db } from "./firebase.js";
import { DailyMetrics, Post } from "../types/index.js";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

export async function generateAnalyticsCSV(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<string> {
  const snapshot = await db
    .analyticsDaily(orgId)
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .orderBy("date", "asc")
    .get();

  const headers = [
    "date",
    "impressions",
    "reach",
    "engagements",
    "likes",
    "comments",
    "shares",
    "saves",
    "videoViews",
    "followers",
    "engagementRate",
  ];

  const rows = snapshot.docs.map((doc) => {
    const d = doc.data() as DailyMetrics;
    return [
      d.date,
      String(d.impressions ?? 0),
      String(d.reach ?? 0),
      String(d.engagements ?? 0),
      String(d.likes ?? 0),
      String(d.comments ?? 0),
      String(d.shares ?? 0),
      String(d.saves ?? 0),
      String(d.videoViews ?? 0),
      String(d.followers ?? 0),
      String(d.engagementRate ?? 0),
    ];
  });

  return toCSV(headers, rows);
}

export async function generatePostsCSV(
  orgId: string,
  status?: string,
  startDate?: string,
  endDate?: string
): Promise<string> {
  let query: FirebaseFirestore.Query = db.posts(orgId).orderBy("createdAt", "desc");

  if (status) {
    query = query.where("status", "==", status);
  }

  const snapshot = await query.get();

  const headers = [
    "id",
    "content",
    "status",
    "platforms",
    "scheduledAt",
    "publishedAt",
    "createdAt",
  ];

  const rows: string[][] = [];
  for (const doc of snapshot.docs) {
    const p = doc.data() as Post;

    // Filter by date range if provided
    if (startDate || endDate) {
      const createdAt = p.createdAt?.toDate?.()
        ? p.createdAt.toDate().toISOString().split("T")[0]
        : "";
      if (startDate && createdAt < startDate) continue;
      if (endDate && createdAt > endDate) continue;
    }

    const content = (p.content || "").substring(0, 100);
    const platforms = (p.platforms || []).map((pl) => pl.accountId).join("; ");
    const scheduledAt = p.scheduledAt?.toDate?.()
      ? p.scheduledAt.toDate().toISOString()
      : "";
    const publishedAt = p.publishedAt?.toDate?.()
      ? p.publishedAt.toDate().toISOString()
      : "";
    const createdAt = p.createdAt?.toDate?.()
      ? p.createdAt.toDate().toISOString()
      : "";

    rows.push([
      doc.id,
      content,
      p.status,
      platforms,
      scheduledAt,
      publishedAt,
      createdAt,
    ]);
  }

  return toCSV(headers, rows);
}

export async function generateAccountCSV(
  orgId: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<string> {
  const snapshot = await db
    .accountAnalytics(orgId, accountId)
    .where("__name__", ">=", startDate)
    .where("__name__", "<=", endDate)
    .orderBy("__name__", "asc")
    .get();

  const headers = [
    "date",
    "impressions",
    "reach",
    "engagements",
    "likes",
    "comments",
    "shares",
    "saves",
    "videoViews",
    "followers",
  ];

  const rows = snapshot.docs.map((doc) => {
    const d = doc.data();
    return [
      doc.id,
      String(d.impressions ?? 0),
      String(d.reach ?? 0),
      String(d.engagements ?? 0),
      String(d.likes ?? 0),
      String(d.comments ?? 0),
      String(d.shares ?? 0),
      String(d.saves ?? 0),
      String(d.videoViews ?? 0),
      String(d.followers ?? 0),
    ];
  });

  return toCSV(headers, rows);
}
