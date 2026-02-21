import { FastifyInstance, FastifyRequest } from "fastify";
import { stripe } from "../services/stripe.js";
import { db } from "../services/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { PLAN_CONFIGS } from "../config/plans.js";
import { PlanTier } from "../types/index.js";
import Stripe from "stripe";

// The raw body buffer is attached in index.ts content type parser
interface RequestWithRawBody extends FastifyRequest {
  rawBody?: Buffer;
}

function mapPriceIdToTier(priceId: string): PlanTier | null {
  for (const config of Object.values(PLAN_CONFIGS)) {
    if (
      config.stripePriceIdMonthly === priceId ||
      config.stripePriceIdYearly === priceId
    ) {
      return config.tier;
    }
  }
  return null;
}

async function findUserByCustomerId(
  customerId: string
): Promise<string | null> {
  const snapshot = await db
    .users()
    .where("stripeCustomerId", "==", customerId)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0].id;
}

export async function webhookRoutes(fastify: FastifyInstance) {
  // Stripe webhook — no auth middleware, uses signature verification
  fastify.post("/stripe", async (request: RequestWithRawBody, reply) => {
    const sig = request.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return reply.status(400).send({ error: "Missing signature or webhook secret" });
    }

    if (!request.rawBody) {
      return reply.status(400).send({ error: "Missing raw body for signature verification" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody,
        sig,
        webhookSecret
      );
    } catch (err) {
      request.log.error(err, "Stripe webhook signature verification failed");
      return reply.status(400).send({ error: "Invalid signature" });
    }

    request.log.info({ eventType: event.type, eventId: event.id }, "Stripe webhook received");

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.metadata?.firebaseUserId ||
          (session.customer
            ? await findUserByCustomerId(session.customer as string)
            : null);

        if (!userId) {
          request.log.warn({ session: session.id }, "No user found for checkout session");
          break;
        }

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id;
          const tier = priceId ? mapPriceIdToTier(priceId) : null;

          const subAny = sub as any;
          await db.user(userId).update({
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: session.customer as string,
            subscriptionStatus: sub.status,
            planTier: tier || "creator",
            currentPeriodEnd: subAny.current_period_end
              ? Timestamp.fromDate(new Date(subAny.current_period_end * 1000))
              : null,
            trialEndsAt: sub.trial_end
              ? Timestamp.fromDate(new Date(sub.trial_end * 1000))
              : null,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          sub.metadata?.firebaseUserId ||
          (await findUserByCustomerId(sub.customer as string));

        if (!userId) {
          request.log.warn({ subscriptionId: sub.id }, "No user found for subscription update");
          break;
        }

        const priceId = sub.items.data[0]?.price?.id;
        const tier = priceId ? mapPriceIdToTier(priceId) : null;

        const subAny = sub as any;
        const updateData: Record<string, unknown> = {
          subscriptionStatus: sub.status,
          currentPeriodEnd: subAny.current_period_end
            ? Timestamp.fromDate(new Date(subAny.current_period_end * 1000))
            : null,
        };

        if (tier) {
          updateData.planTier = tier;
        }

        if (sub.trial_end) {
          updateData.trialEndsAt = Timestamp.fromDate(
            new Date(sub.trial_end * 1000)
          );
        }

        await db.user(userId).update(updateData);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId =
          sub.metadata?.firebaseUserId ||
          (await findUserByCustomerId(sub.customer as string));

        if (!userId) {
          request.log.warn({ subscriptionId: sub.id }, "No user found for subscription deletion");
          break;
        }

        await db.user(userId).update({
          planTier: "free",
          subscriptionStatus: "canceled",
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
          trialEndsAt: null,
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = invoice.parent?.subscription_details?.metadata?.firebaseUserId
          || (await findUserByCustomerId(invoice.customer as string));

        if (userId) {
          await db.user(userId).update({
            subscriptionStatus: "active",
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const userId = invoice.parent?.subscription_details?.metadata?.firebaseUserId
          || (await findUserByCustomerId(invoice.customer as string));

        if (userId) {
          await db.user(userId).update({
            subscriptionStatus: "past_due",
          });
        }
        break;
      }

      default:
        request.log.info({ eventType: event.type }, "Unhandled webhook event");
    }

    return reply.send({ received: true });
  });
}
