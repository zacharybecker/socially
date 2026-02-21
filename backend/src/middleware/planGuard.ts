import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../services/firebase.js";
import { getPlanLimits } from "../config/plans.js";
import { PlanTier, PlanLimits, UsagePeriod } from "../types/index.js";
import { checkLimit } from "../services/usage.js";

type BooleanFeature = {
  [K in keyof PlanLimits]: PlanLimits[K] extends boolean ? K : never;
}[keyof PlanLimits];

export function requireFeature(feature: BooleanFeature) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.uid;
    const userDoc = await db.user(userId).get();
    const planTier = (userDoc.data()?.planTier as PlanTier) || "free";
    const limits = getPlanLimits(planTier);

    if (!limits[feature]) {
      return reply.status(403).send({
        success: false,
        error: `Your ${planTier} plan does not include ${feature}. Please upgrade your plan.`,
        code: "FEATURE_NOT_AVAILABLE",
      });
    }
  };
}

export function requireQuota(metric: keyof UsagePeriod) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const userId = request.user!.uid;
    const result = await checkLimit(userId, metric);

    if (!result.allowed) {
      return reply.status(429).send({
        success: false,
        error: "Usage limit exceeded. Please upgrade your plan.",
        code: "QUOTA_EXCEEDED",
        current: result.current,
        limit: result.limit,
      });
    }
  };
}
