import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebase.js";
import { getPlanLimits } from "../config/plans.js";
import { PlanTier, UsagePeriod } from "../types/index.js";

function getCurrentPeriodId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const DEFAULT_USAGE: UsagePeriod = {
  postsCreated: 0,
  aiCreditsUsed: 0,
  imageGenerationsUsed: 0,
  videoGenerationsUsed: 0,
  storageMBUsed: 0,
};

export async function getUsage(userId: string): Promise<UsagePeriod> {
  const periodId = getCurrentPeriodId();
  const doc = await db.usagePeriod(userId, periodId).get();

  if (!doc.exists) {
    await db.usagePeriod(userId, periodId).set(DEFAULT_USAGE);
    return { ...DEFAULT_USAGE };
  }

  return doc.data() as UsagePeriod;
}

export async function incrementUsage(
  userId: string,
  metric: keyof UsagePeriod,
  amount: number = 1
): Promise<void> {
  const periodId = getCurrentPeriodId();
  const ref = db.usagePeriod(userId, periodId);
  const doc = await ref.get();

  if (!doc.exists) {
    await ref.set({ ...DEFAULT_USAGE, [metric]: amount });
  } else {
    await ref.update({ [metric]: FieldValue.increment(amount) });
  }
}

const METRIC_TO_LIMIT: Record<keyof UsagePeriod, keyof ReturnType<typeof getPlanLimits>> = {
  postsCreated: "postsPerMonth",
  aiCreditsUsed: "aiCreditsPerMonth",
  imageGenerationsUsed: "imageGenerations",
  videoGenerationsUsed: "videoGenerations",
  storageMBUsed: "storageMB",
};

export async function checkLimit(
  userId: string,
  metric: keyof UsagePeriod
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const userDoc = await db.user(userId).get();
  const planTier = (userDoc.data()?.planTier as PlanTier) || "free";
  const limits = getPlanLimits(planTier);

  const limitKey = METRIC_TO_LIMIT[metric];
  const limit = limits[limitKey] as number;

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, current: 0, limit: -1 };
  }

  const usage = await getUsage(userId);
  const current = usage[metric];

  return { allowed: current < limit, current, limit };
}

export async function resetMonthlyUsage(): Promise<void> {
  const usersSnapshot = await db.users().get();

  for (const userDoc of usersSnapshot.docs) {
    const periodId = getCurrentPeriodId();
    await db.usagePeriod(userDoc.id, periodId).set(DEFAULT_USAGE);
  }

  console.log(`Reset monthly usage for ${usersSnapshot.size} users`);
}
