import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import {
  generateWithOpenAI,
  analyzeContent,
  generateHashtags,
  refineContent,
  generateCaptionVariations,
  generateImage,
  generateWithBrandVoice,
} from "../services/openai.js";
import {
  initiateVideoGeneration,
  checkVideoJobStatus,
  listVideoJobs,
} from "../services/video-generation.js";
import { getStorage } from "../services/firebase.js";
import { requireQuota } from "../middleware/planGuard.js";
import { incrementUsage } from "../services/usage.js";

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

const generateHashtagsSchema = z.object({
  content: z.string().min(1, "Content is required").max(2000),
  platform: z.enum(["tiktok", "instagram"]),
  count: z.number().int().min(1).max(30).default(10),
});

const analyzeContentSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000),
});

const refineContentSchema = z.object({
  content: z.string().min(1, "Content is required").max(5000),
  action: z.enum(["rewrite", "shorten", "expand", "change_tone"]),
  tone: z.enum(["professional", "casual", "humorous", "dramatic", "inspirational"]).optional(),
  platform: z.enum(["tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin", "threads"]).optional(),
  useBrandVoice: z.boolean().default(false),
});

const generateCaptionVariationsSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(500),
  platform: z.enum(["tiktok", "instagram", "youtube", "twitter", "facebook", "linkedin", "threads"]),
  count: z.number().int().min(1).max(5).default(3),
});

const generateImageSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(1000),
  size: z.enum(["1024x1024", "1792x1024", "1024x1792"]).default("1024x1024"),
  style: z.enum(["vivid", "natural"]).default("vivid"),
  quality: z.enum(["standard", "hd"]).default("standard"),
});

const generateVideoSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(1000),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
});

export async function aiRoutes(fastify: FastifyInstance) {
  // Generate hooks
  fastify.post(
    "/generate-hook",
    { preHandler: [authenticate, requireQuota("aiCreditsUsed")] },
    async (request, reply) => {
      const { topic, niche, tone, count } = validateBody(generateHookSchema, request.body);

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

      await incrementUsage(request.user!.uid, "aiCreditsUsed", 1);

      return reply.send({
        success: true,
        data: { hooks },
      });
    }
  );

  // Generate captions
  fastify.post(
    "/generate-caption",
    { preHandler: [authenticate, requireQuota("aiCreditsUsed")] },
    async (request, reply) => {
      const { topic, platform, tone, includeHashtags, maxLength } = validateBody(
        generateCaptionSchema,
        request.body
      );

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

      await incrementUsage(request.user!.uid, "aiCreditsUsed", 1);

      return reply.send({
        success: true,
        data: { captions },
      });
    }
  );

  // Generate content ideas
  fastify.post(
    "/generate-ideas",
    { preHandler: [authenticate, requireQuota("aiCreditsUsed")] },
    async (request, reply) => {
      const { niche, count, contentType } = validateBody(generateIdeasSchema, request.body);

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

      await incrementUsage(request.user!.uid, "aiCreditsUsed", 1);

      return reply.send({
        success: true,
        data: { ideas },
      });
    }
  );

  // Generate video script
  fastify.post(
    "/generate-script",
    { preHandler: [authenticate, requireQuota("aiCreditsUsed")] },
    async (request, reply) => {
      const { topic, duration, style } = validateBody(generateScriptSchema, request.body);

      const durationSeconds = parseInt(duration.replace("s", ""), 10);

      const prompt = `Write a ${duration} video script about "${topic}" in a ${style} style.

The script should include:
1. [HOOK - 0:00] - Attention-grabbing opening (3-5 seconds)
2. [CONTENT] - Main content with timestamps
3. [CTA] - Call to action at the end

Format with clear section headers and approximate timestamps.
Keep it natural and conversational for speaking on camera.
Total duration should be approximately ${durationSeconds} seconds when spoken.`;

      const script = await generateWithOpenAI(prompt);

      await incrementUsage(request.user!.uid, "aiCreditsUsed", 1);

      return reply.send({
        success: true,
        data: { script: script.trim() },
      });
    }
  );

  // Generate hashtags
  fastify.post(
    "/generate-hashtags",
    { preHandler: [authenticate, requireQuota("aiCreditsUsed")] },
    async (request, reply) => {
      const { content, platform, count } = validateBody(generateHashtagsSchema, request.body);

      const hashtags = await generateHashtags(content, platform, count);

      await incrementUsage(request.user!.uid, "aiCreditsUsed", 1);

      return reply.send({
        success: true,
        data: { hashtags },
      });
    }
  );

  // Analyze content
  fastify.post(
    "/analyze-content",
    { preHandler: [authenticate, requireQuota("aiCreditsUsed")] },
    async (request, reply) => {
      const { content } = validateBody(analyzeContentSchema, request.body);

      const analysis = await analyzeContent(content);

      await incrementUsage(request.user!.uid, "aiCreditsUsed", 1);

      return reply.send({
        success: true,
        data: analysis,
      });
    }
  );

  // Refine content
  fastify.post(
    "/refine-content",
    { preHandler: [authenticate, requireQuota("aiCreditsUsed")] },
    async (request, reply) => {
      const { content, action, tone, platform, useBrandVoice } = validateBody(
        refineContentSchema,
        request.body
      );

      let refined: string;
      if (useBrandVoice) {
        // Need orgId from query for brand voice
        const orgId = (request.query as { orgId?: string }).orgId;
        if (!orgId) {
          return reply.status(400).send({
            success: false,
            error: "orgId query parameter required when useBrandVoice is true",
          });
        }
        const refinementPrompt = `${action === "change_tone" && tone ? `Change the tone to ${tone}. ` : `${action} this content. `}Content: "${content}"${platform ? ` Optimize for ${platform}.` : ""}\n\nReturn only the refined content.`;
        refined = await generateWithBrandVoice(orgId, refinementPrompt);
      } else {
        refined = await refineContent(content, action, { tone, platform });
      }

      await incrementUsage(request.user!.uid, "aiCreditsUsed", 1);

      return reply.send({
        success: true,
        data: { refined },
      });
    }
  );

  // Generate caption variations
  fastify.post(
    "/generate-caption-variations",
    { preHandler: [authenticate, requireQuota("aiCreditsUsed")] },
    async (request, reply) => {
      const { topic, platform, count } = validateBody(
        generateCaptionVariationsSchema,
        request.body
      );

      const variations = await generateCaptionVariations(topic, platform, count);

      await incrementUsage(request.user!.uid, "aiCreditsUsed", 1);

      return reply.send({
        success: true,
        data: { variations },
      });
    }
  );

  // Generate image
  fastify.post(
    "/generate-image",
    { preHandler: [authenticate, requireQuota("imageGenerationsUsed")] },
    async (request, reply) => {
      const { prompt, size, style, quality } = validateBody(generateImageSchema, request.body);

      // Generate image via OpenAI DALL-E
      const tempUrl = await generateImage(prompt, { size, style, quality });

      if (!tempUrl) {
        return reply.status(500).send({
          success: false,
          error: "Failed to generate image",
        });
      }

      // Download image from temp URL and upload to Firebase Storage
      const imageResponse = await fetch(tempUrl);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      const fileName = `ai-images/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.png`;
      const bucket = getStorage().bucket();
      const file = bucket.file(fileName);

      await file.save(imageBuffer, {
        metadata: {
          contentType: "image/png",
        },
      });

      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      await incrementUsage(request.user!.uid, "imageGenerationsUsed", 1);

      return reply.send({
        success: true,
        data: { url: publicUrl },
      });
    }
  );

  // Generate video (initiate job)
  fastify.post(
    "/generate-video",
    { preHandler: [authenticate, requireQuota("videoGenerationsUsed")] },
    async (request, reply) => {
      const { prompt, aspectRatio } = validateBody(generateVideoSchema, request.body);

      const orgId = (request.query as { orgId?: string }).orgId;
      if (!orgId) {
        return reply.status(400).send({
          success: false,
          error: "orgId query parameter is required",
        });
      }

      const jobId = await initiateVideoGeneration(orgId, request.user!.uid, prompt, aspectRatio);

      await incrementUsage(request.user!.uid, "videoGenerationsUsed", 1);

      return reply.send({
        success: true,
        data: { jobId, status: "processing" },
      });
    }
  );

  // Check video job status
  fastify.get(
    "/video-jobs/:jobId",
    { preHandler: authenticate },
    async (request, reply) => {
      const { jobId } = request.params as { jobId: string };
      const orgId = (request.query as { orgId?: string }).orgId;

      if (!orgId) {
        return reply.status(400).send({
          success: false,
          error: "orgId query parameter is required",
        });
      }

      const job = await checkVideoJobStatus(orgId, jobId);

      if (!job) {
        return reply.status(404).send({
          success: false,
          error: "Video job not found",
        });
      }

      return reply.send({
        success: true,
        data: job,
      });
    }
  );

  // List video jobs
  fastify.get(
    "/video-jobs",
    { preHandler: authenticate },
    async (request, reply) => {
      const { orgId, limit } = request.query as { orgId?: string; limit?: string };

      if (!orgId) {
        return reply.status(400).send({
          success: false,
          error: "orgId query parameter is required",
        });
      }

      const jobs = await listVideoJobs(orgId, limit ? parseInt(limit, 10) : undefined);

      return reply.send({
        success: true,
        data: { jobs },
      });
    }
  );
}
