import OpenAI from "openai";

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
  }
): Promise<string> {
  const {
    maxTokens = 1000,
    temperature = 0.7,
    model = "gpt-4-turbo-preview",
  } = options || {};

  const response = await getOpenAI().chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are a social media content expert who creates engaging, viral-worthy content for TikTok and Instagram. Your responses should be creative, trendy, and optimized for short-form video platforms.",
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
