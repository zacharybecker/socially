import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/validation.js";
import { createError } from "../middleware/errorHandler.js";
import { db } from "../services/firebase.js";
import {
  createCheckoutSession,
  createCustomerPortalSession,
  getSubscription,
  cancelSubscription,
} from "../services/stripe.js";
import { getUsage } from "../services/usage.js";
import { getPlanLimits, getPlanConfig, PLAN_CONFIGS } from "../config/plans.js";
import { PlanTier } from "../types/index.js";

const createCheckoutSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  period: z.enum(["monthly", "yearly"]),
});

export async function billingRoutes(fastify: FastifyInstance) {
  // Create Stripe Checkout session
  fastify.post(
    "/create-checkout",
    { preHandler: authenticate },
    async (request, reply) => {
      const { priceId, period } = validateBody(createCheckoutSchema, request.body);
      const userId = request.user!.uid;

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const successUrl = `${frontendUrl}/dashboard/settings?billing=success`;
      const cancelUrl = `${frontendUrl}/dashboard/settings?billing=canceled`;

      const url = await createCheckoutSession(userId, priceId, successUrl, cancelUrl);

      return reply.send({ success: true, data: { url } });
    }
  );

  // Create Stripe Customer Portal session
  fastify.post(
    "/customer-portal",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.uid;
      const userDoc = await db.user(userId).get();
      const userData = userDoc.data();

      if (!userData?.stripeCustomerId) {
        throw createError("No billing account found. Please subscribe to a plan first.", 400);
      }

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const returnUrl = `${frontendUrl}/dashboard/settings`;

      const url = await createCustomerPortalSession(userData.stripeCustomerId, returnUrl);

      return reply.send({ success: true, data: { url } });
    }
  );

  // Get current subscription status
  fastify.get(
    "/subscription",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.uid;
      const userDoc = await db.user(userId).get();
      const userData = userDoc.data();

      const planTier = (userData?.planTier as PlanTier) || "free";
      const config = getPlanConfig(planTier);

      const result: Record<string, unknown> = {
        planTier,
        planName: config.name,
        subscriptionStatus: userData?.subscriptionStatus || null,
        currentPeriodEnd: userData?.currentPeriodEnd?.toDate?.() || null,
        trialEndsAt: userData?.trialEndsAt?.toDate?.() || null,
      };

      if (userData?.stripeSubscriptionId) {
        try {
          const sub = await getSubscription(userData.stripeSubscriptionId);
          result.cancelAtPeriodEnd = sub.cancel_at_period_end;
        } catch {
          // Subscription may not exist anymore
        }
      }

      return reply.send({ success: true, data: result });
    }
  );

  // Get current period usage with plan limits
  fastify.get(
    "/usage",
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.uid;
      const userDoc = await db.user(userId).get();
      const planTier = (userDoc.data()?.planTier as PlanTier) || "free";

      const usage = await getUsage(userId);
      const limits = getPlanLimits(planTier);

      return reply.send({
        success: true,
        data: { usage, limits, planTier },
      });
    }
  );

  // Get all plan configs (public info)
  fastify.get(
    "/plans",
    { preHandler: authenticate },
    async (_request, reply) => {
      const plans = Object.values(PLAN_CONFIGS).map(
        ({ stripePriceIdMonthly, stripePriceIdYearly, ...rest }) => ({
          ...rest,
          stripePriceIdMonthly: stripePriceIdMonthly || undefined,
          stripePriceIdYearly: stripePriceIdYearly || undefined,
        })
      );

      return reply.send({ success: true, data: plans });
    }
  );
}
