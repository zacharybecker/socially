import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { generateWithOpenAI } from "../services/openai.js";

const generateHookSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(500),
  niche: z.string().max(500).optional(),
  tone: z.enum(["professional", "casual", "humorous", "dramatic"]).default("casual"),
  count: z.number().int().min(1).max(10).default(5),
});

const generateCaptionSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(500),
  platform: z.enum(["tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin", "threads"]),
  tone: z.enum(["professional", "casual", "humorous"]).default("casual"),
  includeHashtags: z.boolean().default(true),
  maxLength: z.number().int().min(1).max(2200).default(2200),
});

const generateIdeasSchema = z.object({
  niche: z.string().min(1, "Niche is required").max(500),
  count: z.number().int().min(1).max(10).default(10),
  contentType: z.enum(["educational", "entertaining", "promotional", "behind-the-scenes"]).optional(),
});

const generateScriptSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(500),
  duration: z.enum(["15s", "30s", "60s", "90s"]).default("30s"),
  style: z.enum(["storytelling", "listicle", "tutorial", "reaction"]).default("storytelling"),
});

export async function aiRoutes(fastify: FastifyInstance) {
  // Generate hooks
  fastify.post(
    "/generate-hook",
    { preHandler: authenticate },
    async (request, reply) => {
      const { topic, niche, tone, count } = validateBody(generateHookSchema, request.body);

      try {
        const prompt = `Generate ${count} attention-grabbing hooks for a short-form video about "${topic}"${niche ? ` in the ${niche} niche` : ""}.
The tone should be ${tone}.
Each hook should be:
- Under 15 words
- Create curiosity or urgency
- Make the viewer want to keep watching

Return only the hooks, one per line, without numbering or bullet points.`;

        const result = await generateWithOpenAI(prompt);
        const hooks = result
          .split("\n")
          .map((h) => h.trim())
          .filter((h) => h.length > 0)
          .slice(0, count);

        return reply.send({
          success: true,
          data: { hooks },
        });
      } catch (error) {
        request.log.error(error, "Error generating hooks");
        return reply.status(500).send({
          success: false,
          error: "Failed to generate hooks",
        });
      }
    }
  );

  // Generate captions
  fastify.post(
    "/generate-caption",
    { preHandler: authenticate },
    async (request, reply) => {
      const { topic, platform, tone, includeHashtags, maxLength } = validateBody(
        generateCaptionSchema,
        request.body
      );

      try {
        const prompt = `Generate 2 engaging ${platform} captions about "${topic}".
The tone should be ${tone}.
${includeHashtags ? "Include 5-10 relevant hashtags at the end." : "Do not include hashtags."}
Maximum length: ${maxLength} characters.

Each caption should:
- Have a strong opening line
- Include a call-to-action
- Be formatted for ${platform}

Separate each caption with "---".`;

        const result = await generateWithOpenAI(prompt);
        const captions = result
          .split("---")
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        return reply.send({
          success: true,
          data: { captions },
        });
      } catch (error) {
        request.log.error(error, "Error generating captions");
        return reply.status(500).send({
          success: false,
          error: "Failed to generate captions",
        });
      }
    }
  );

  // Generate content ideas
  fastify.post(
    "/generate-ideas",
    { preHandler: authenticate },
    async (request, reply) => {
      const { niche, count, contentType } = validateBody(generateIdeasSchema, request.body);

      try {
        const prompt = `Generate ${count} unique content ideas for short-form videos in the "${niche}" niche.
${contentType ? `Focus on ${contentType} content.` : "Mix educational, entertaining, and engaging content."}

Each idea should:
- Be specific and actionable
- Work well for TikTok/Instagram Reels
- Have viral potential

Return only the ideas, one per line, without numbering.`;

        const result = await generateWithOpenAI(prompt);
        const ideas = result
          .split("\n")
          .map((i) => i.trim())
          .filter((i) => i.length > 0)
          .slice(0, count);

        return reply.send({
          success: true,
          data: { ideas },
        });
      } catch (error) {
        request.log.error(error, "Error generating ideas");
        return reply.status(500).send({
          success: false,
          error: "Failed to generate ideas",
        });
      }
    }
  );

  // Generate video script
  fastify.post(
    "/generate-script",
    { preHandler: authenticate },
    async (request, reply) => {
      const { topic, duration, style } = validateBody(generateScriptSchema, request.body);

      const durationSeconds = parseInt(duration.replace("s", ""), 10);

      try {
        const prompt = `Write a ${duration} video script about "${topic}" in a ${style} style.

The script should include:
1. [HOOK - 0:00] - Attention-grabbing opening (3-5 seconds)
2. [CONTENT] - Main content with timestamps
3. [CTA] - Call to action at the end

Format with clear section headers and approximate timestamps.
Keep it natural and conversational for speaking on camera.
Total duration should be approximately ${durationSeconds} seconds when spoken.`;

        const script = await generateWithOpenAI(prompt);

        return reply.send({
          success: true,
          data: { script: script.trim() },
        });
      } catch (error) {
        request.log.error(error, "Error generating script");
        return reply.status(500).send({
          success: false,
          error: "Failed to generate script",
        });
      }
    }
  );
}
