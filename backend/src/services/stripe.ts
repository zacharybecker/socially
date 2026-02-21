import Stripe from "stripe";
import { db } from "./firebase.js";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY not set — Stripe features will be unavailable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-01-28.clover",
});

export async function createCustomer(
  userId: string,
  email: string
): Promise<string> {
  const customer = await stripe.customers.create({
    email,
    metadata: { firebaseUserId: userId },
  });

  await db.user(userId).update({ stripeCustomerId: customer.id });

  return customer.id;
}

export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const userDoc = await db.user(userId).get();
  const userData = userDoc.data();

  let customerId = userData?.stripeCustomerId;
  if (!customerId) {
    customerId = await createCustomer(userId, userData?.email || "");
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 14,
      metadata: { firebaseUserId: userId },
    },
    metadata: { firebaseUserId: userId },
  });

  return session.url!;
}

export async function createCustomerPortalSession(
  stripeCustomerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function cancelSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function getSubscription(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(stripeSubscriptionId);
}
