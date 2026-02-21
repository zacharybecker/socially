import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";
import { AISuggestion } from "../types/index.js";
import { generateWithOpenAI } from "./openai.js";

export async function generatePostingTimeSuggestions(
  orgId: string
): Promise<AISuggestion[]> {
  // Fetch recent posts to analyze posting patterns
  const postsSnapshot = await db
    .posts(orgId)
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .limit(50)
    .get();

  const posts = postsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      publishedAt: data.publishedAt?.toDate?.()?.toISOString() || "",
      engagements: data.engagements || 0,
      impressions: data.impressions || 0,
    };
  });

  const prompt = `Based on these published posts with their publish times and engagement data, suggest optimal posting times.

Posts data:
${JSON.stringify(posts.slice(0, 20), null, 2)}

Provide 2-3 suggestions for optimal posting times. Respond in JSON format:
[
  {
    "title": "Short suggestion title",
    "description": "Detailed explanation with recommended days and times",
    "data": { "days": ["Monday", "Wednesday"], "timeRange": "9am-11am" }
  }
]

Return only valid JSON array.`;

  const response = await generateWithOpenAI(prompt, { temperature: 0.4, maxTokens: 1000 });

  try {
    const parsed = JSON.parse(response);
    return parsed.map((item: { title: string; description: string; data?: Record<string, unknown> }) => ({
      type: "posting_time" as const,
      title: item.title,
      description: item.description,
      status: "active" as const,
      data: item.data || {},
    }));
  } catch {
    return [];
  }
}

export async function generateContentSuggestions(
  orgId: string
): Promise<AISuggestion[]> {
  const postsSnapshot = await db
    .posts(orgId)
    .where("status", "==", "published")
    .orderBy("createdAt", "desc")
    .limit(30)
    .get();

  const posts = postsSnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      content: (data.content || "").substring(0, 150),
      platforms: (data.platforms || []).map((p: { accountId: string }) => p.accountId),
    };
  });

  const prompt = `Analyze these recent social media posts and suggest new content ideas based on patterns.

Recent posts:
${JSON.stringify(posts.slice(0, 15), null, 2)}

Provide 3 content suggestions. Respond in JSON format:
[
  {
    "title": "Content idea title",
    "description": "Detailed content suggestion with format, talking points, and platform recommendations"
  }
]

Return only valid JSON array.`;

  const response = await generateWithOpenAI(prompt, { temperature: 0.7, maxTokens: 1000 });

  try {
    const parsed = JSON.parse(response);
    return parsed.map((item: { title: string; description: string }) => ({
      type: "content_idea" as const,
      title: item.title,
      description: item.description,
      status: "active" as const,
    }));
  } catch {
    return [];
  }
}

export async function generateTrendingSuggestions(
  orgId: string
): Promise<AISuggestion[]> {
  // Get org info to understand their niche
  const orgDoc = await db.organization(orgId).get();
  const orgName = orgDoc.exists ? orgDoc.data()?.name || "Unknown" : "Unknown";

  const prompt = `Suggest 2-3 trending social media topics that a brand called "${orgName}" could create content about. Focus on current social media trends, viral formats, and emerging topics.

Respond in JSON format:
[
  {
    "title": "Trending topic title",
    "description": "How to leverage this trend with specific content ideas and format suggestions"
  }
]

Return only valid JSON array.`;

  const response = await generateWithOpenAI(prompt, { temperature: 0.8, maxTokens: 1000 });

  try {
    const parsed = JSON.parse(response);
    return parsed.map((item: { title: string; description: string }) => ({
      type: "trending_topic" as const,
      title: item.title,
      description: item.description,
      status: "active" as const,
    }));
  } catch {
    return [];
  }
}

export async function generateAllSuggestions(orgId: string): Promise<void> {
  // Clear old active suggestions
  const existingSnapshot = await db
    .aiSuggestions(orgId)
    .where("status", "==", "active")
    .get();

  const batch = db.aiSuggestions(orgId).firestore.batch();
  for (const doc of existingSnapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();

  // Generate all suggestion types in parallel
  const [postingTime, content, trending] = await Promise.all([
    generatePostingTimeSuggestions(orgId),
    generateContentSuggestions(orgId),
    generateTrendingSuggestions(orgId),
  ]);

  const allSuggestions = [...postingTime, ...content, ...trending];

  // Store suggestions in Firestore
  const writeBatch = db.aiSuggestions(orgId).firestore.batch();
  for (const suggestion of allSuggestions) {
    const ref = db.aiSuggestions(orgId).doc();
    writeBatch.set(ref, {
      ...suggestion,
      id: ref.id,
      createdAt: Timestamp.now(),
    });
  }
  await writeBatch.commit();
}
