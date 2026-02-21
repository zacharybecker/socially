import OpenAI from "openai";
import { CaptionVariation, BrandVoice } from "../types/index.js";
import { db } from "./firebase.js";

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export async function generateWithOpenAI(
  prompt: string,
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
    systemPrompt?: string;
  }
): Promise<string> {
  const {
    maxTokens = 1000,
    temperature = 0.7,
    model = "gpt-4-turbo-preview",
    systemPrompt = "You are a social media content expert who creates engaging, viral-worthy content for TikTok and Instagram. Your responses should be creative, trendy, and optimized for short-form video platforms.",
  } = options || {};

  const response = await getOpenAI().chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: maxTokens,
    temperature,
  });

  return response.choices[0]?.message?.content || "";
}

export async function analyzeContent(content: string): Promise<{
  sentiment: "positive" | "negative" | "neutral";
  topics: string[];
  suggestions: string[];
}> {
  const prompt = `Analyze this social media content and provide:
1. Sentiment (positive, negative, or neutral)
2. Main topics (up to 5)
3. Suggestions for improvement (up to 3)

Content: "${content}"

Respond in JSON format:
{
  "sentiment": "positive|negative|neutral",
  "topics": ["topic1", "topic2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

  const response = await generateWithOpenAI(prompt, { temperature: 0.3 });

  try {
    return JSON.parse(response);
  } catch {
    return {
      sentiment: "neutral",
      topics: [],
      suggestions: [],
    };
  }
}

export async function generateHashtags(
  content: string,
  platform: "tiktok" | "instagram",
  count: number = 10
): Promise<string[]> {
  const prompt = `Generate ${count} relevant hashtags for this ${platform} post:
"${content}"

Requirements:
- Mix of popular and niche hashtags
- Relevant to the content
- Formatted with # symbol
- One hashtag per line

Return only the hashtags, nothing else.`;

  const response = await generateWithOpenAI(prompt, { temperature: 0.5 });

  return response
    .split("\n")
    .map((h) => h.trim())
    .filter((h) => h.startsWith("#"))
    .slice(0, count);
}

export async function refineContent(
  content: string,
  action: "rewrite" | "shorten" | "expand" | "change_tone",
  options?: { tone?: string; platform?: string }
): Promise<string> {
  const actionPrompts: Record<string, string> = {
    rewrite: `Rewrite the following social media content to make it more engaging and impactful while preserving the core message:\n\n"${content}"`,
    shorten: `Shorten the following social media content while keeping the key message intact. Make it concise and punchy:\n\n"${content}"`,
    expand: `Expand the following social media content with more detail, context, and engagement hooks. Add a call-to-action if appropriate:\n\n"${content}"`,
    change_tone: `Rewrite the following social media content in a ${options?.tone || "casual"} tone:\n\n"${content}"`,
  };

  let prompt = actionPrompts[action];
  if (options?.platform) {
    prompt += `\n\nOptimize for ${options.platform}.`;
  }
  prompt += "\n\nReturn only the refined content, nothing else.";

  return (await generateWithOpenAI(prompt, { temperature: 0.7 })).trim();
}

export async function generateCaptionVariations(
  topic: string,
  platform: string,
  count: number = 3
): Promise<CaptionVariation[]> {
  const tones = ["professional", "casual", "humorous", "inspirational", "storytelling"];
  const selectedTones = tones.slice(0, count);

  const prompt = `Generate ${count} caption variations for a ${platform} post about "${topic}".
Each variation should use a different tone: ${selectedTones.join(", ")}.

For each variation include:
- The caption text
- The tone used
- 5 relevant hashtags

Respond in JSON format:
[
  {
    "caption": "caption text here",
    "tone": "tone name",
    "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
  }
]

Return only valid JSON, nothing else.`;

  const response = await generateWithOpenAI(prompt, { temperature: 0.8, maxTokens: 2000 });

  try {
    return JSON.parse(response);
  } catch {
    return [];
  }
}

export async function generateImage(
  prompt: string,
  options?: { size?: "1024x1024" | "1792x1024" | "1024x1792"; style?: "vivid" | "natural"; quality?: "standard" | "hd" }
): Promise<string> {
  const {
    size = "1024x1024",
    style = "vivid",
    quality = "standard",
  } = options || {};

  const response = await getOpenAI().images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size,
    style,
    quality,
  });

  return response.data?.[0]?.url || "";
}

export async function generateWithBrandVoice(
  orgId: string,
  prompt: string,
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const brandVoiceDoc = await db.brandVoice(orgId).get();

  if (!brandVoiceDoc.exists) {
    return generateWithOpenAI(prompt, options);
  }

  const brandVoice = brandVoiceDoc.data() as BrandVoice;

  const systemPrompt = `You are a social media content expert. Generate content that matches the following brand voice guidelines:

Tone: ${brandVoice.tone}
Guidelines: ${brandVoice.guidelines}
${brandVoice.keyPhrases.length > 0 ? `Key phrases to incorporate when relevant: ${brandVoice.keyPhrases.join(", ")}` : ""}
${brandVoice.avoidPhrases.length > 0 ? `Phrases to avoid: ${brandVoice.avoidPhrases.join(", ")}` : ""}
${brandVoice.sampleContent.length > 0 ? `Here are examples of content in this brand voice:\n${brandVoice.sampleContent.map((s) => `- "${s}"`).join("\n")}` : ""}

Always match this brand voice in your responses.`;

  return generateWithOpenAI(prompt, {
    ...options,
    systemPrompt,
  });
}

export async function analyzeAnalyticsTrends(
  metrics: {
    dailyMetrics: Array<Record<string, unknown>>;
    totalFollowers: number;
    engagementRate: number;
  },
  posts: Array<{ content: string; engagements: number; impressions: number }>
): Promise<{
  trends: string[];
  bestPostingTimes: string[];
  contentRecommendations: string[];
  insights: Array<{
    type: "trend" | "recommendation" | "alert" | "prediction";
    title: string;
    description: string;
    confidence: number;
  }>;
}> {
  const prompt = `Analyze this social media analytics data and provide actionable insights.

Metrics summary (last ${metrics.dailyMetrics.length} days):
- Total followers: ${metrics.totalFollowers}
- Average engagement rate: ${metrics.engagementRate}%
- Daily metrics sample: ${JSON.stringify(metrics.dailyMetrics.slice(0, 7))}

Top performing posts:
${posts
  .slice(0, 5)
  .map(
    (p, i) =>
      `${i + 1}. "${p.content.substring(0, 100)}..." - ${p.engagements} engagements, ${p.impressions} impressions`
  )
  .join("\n")}

Provide your analysis in this exact JSON format:
{
  "trends": ["trend1", "trend2", "trend3"],
  "bestPostingTimes": ["Monday 9am-11am", "Wednesday 6pm-8pm"],
  "contentRecommendations": ["recommendation1", "recommendation2"],
  "insights": [
    {
      "type": "trend|recommendation|alert|prediction",
      "title": "Short title",
      "description": "Detailed description",
      "confidence": 0.85
    }
  ]
}`;

  const response = await generateWithOpenAI(prompt, {
    maxTokens: 1500,
    temperature: 0.4,
  });

  try {
    return JSON.parse(response);
  } catch {
    return {
      trends: [],
      bestPostingTimes: [],
      contentRecommendations: [],
      insights: [],
    };
  }
}

export async function generatePerformanceReport(
  overview: Record<string, unknown>,
  topPosts: Array<{ content: string; engagements: number; impressions: number }>
): Promise<string> {
  const prompt = `Generate a concise social media performance report in markdown format based on this data:

Overview metrics:
${JSON.stringify(overview, null, 2)}

Top performing posts:
${topPosts
  .slice(0, 5)
  .map(
    (p, i) =>
      `${i + 1}. "${p.content.substring(0, 100)}..." - ${p.engagements} engagements, ${p.impressions} impressions`
  )
  .join("\n")}

The report should include:
1. Executive summary (2-3 sentences)
2. Key metrics highlights
3. Top content analysis
4. Recommendations for improvement

Keep it concise and actionable.`;

  return await generateWithOpenAI(prompt, {
    maxTokens: 2000,
    temperature: 0.5,
  });
}
