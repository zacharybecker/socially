import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { db } from "../services/firebase.js";
import { generateWithOpenAI } from "../services/openai.js";
import { BrandVoice } from "../types/index.js";

const updateBrandVoiceSchema = z.object({
  guidelines: z.string().max(2000).default(""),
  tone: z.string().max(200).default(""),
  keyPhrases: z.array(z.string().max(100)).max(50).default([]),
  avoidPhrases: z.array(z.string().max(100)).max(50).default([]),
  sampleContent: z.array(z.string().max(2000)).max(10).default([]),
});

const analyzeBrandVoiceSchema = z.object({
  sampleContent: z
    .array(z.string().min(1).max(2000))
    .min(1, "At least one content sample is required")
    .max(10),
});

export async function brandVoiceRoutes(fastify: FastifyInstance) {
  // Get brand voice settings
  fastify.get(
    "/",
    { preHandler: [authenticate, requireOrgMembership as any] },
    async (request, reply) => {
      const { orgId } = request.params as { orgId: string };

      const doc = await db.brandVoice(orgId).get();

      if (!doc.exists) {
        return reply.send({
          success: true,
          data: {
            guidelines: "",
            tone: "",
            keyPhrases: [],
            avoidPhrases: [],
            sampleContent: [],
          } as BrandVoice,
        });
      }

      return reply.send({
        success: true,
        data: doc.data() as BrandVoice,
      });
    }
  );

  // Update brand voice settings
  fastify.put(
    "/",
    { preHandler: [authenticate, requireOrgMembership as any] },
    async (request, reply) => {
      const { orgId } = request.params as { orgId: string };
      const data = validateBody(updateBrandVoiceSchema, request.body);

      await db.brandVoice(orgId).set(data, { merge: true });

      return reply.send({
        success: true,
        data,
      });
    }
  );

  // Analyze sample content to extract brand voice characteristics
  fastify.post(
    "/analyze",
    { preHandler: [authenticate, requireOrgMembership as any] },
    async (request, reply) => {
      const { orgId } = request.params as { orgId: string };
      const { sampleContent } = validateBody(analyzeBrandVoiceSchema, request.body);

      const prompt = `Analyze the following content samples and extract brand voice characteristics.

Content samples:
${sampleContent.map((s, i) => `${i + 1}. "${s}"`).join("\n")}

Extract:
1. Overall tone (e.g., professional, casual, witty, authoritative)
2. Writing guidelines (how they communicate)
3. Key phrases or patterns they use frequently
4. Phrases or patterns they seem to avoid

Respond in JSON format:
{
  "tone": "description of the overall tone",
  "guidelines": "detailed writing guidelines based on the samples",
  "keyPhrases": ["phrase1", "phrase2"],
  "avoidPhrases": ["phrase1", "phrase2"]
}

Return only valid JSON.`;

      const response = await generateWithOpenAI(prompt, { temperature: 0.3, maxTokens: 1500 });

      let analysis: { tone: string; guidelines: string; keyPhrases: string[]; avoidPhrases: string[] };
      try {
        analysis = JSON.parse(response);
      } catch {
        analysis = {
          tone: "",
          guidelines: "",
          keyPhrases: [],
          avoidPhrases: [],
        };
      }

      // Optionally save the analysis as the brand voice
      const brandVoice: BrandVoice = {
        ...analysis,
        sampleContent,
      };

      await db.brandVoice(orgId).set(brandVoice, { merge: true });

      return reply.send({
        success: true,
        data: brandVoice,
      });
    }
  );
}
