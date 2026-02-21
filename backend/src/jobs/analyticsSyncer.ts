import { db } from "../services/firebase.js";
import { Organization, SocialAccount, Post } from "../types/index.js";
import {
  syncAccountAnalytics,
  syncPostAnalytics,
  aggregateDailyAnalytics,
  rollupMonthlyAnalytics,
} from "../services/analyticsService.js";

/**
 * Iterate all orgs, their accounts, and sync metrics from platform APIs.
 * Errors are caught per-account so one failure doesn't block others.
 */
export async function syncAllAnalytics(): Promise<void> {
  console.log("Starting analytics sync for all organizations...");

  const orgsSnapshot = await db.organizations().get();
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const currentMonth = today.substring(0, 7); // YYYY-MM

  for (const orgDoc of orgsSnapshot.docs) {
    const orgId = orgDoc.id;

    try {
      // Sync account-level analytics
      const accountsSnapshot = await db.socialAccounts(orgId).get();

      for (const accountDoc of accountsSnapshot.docs) {
        try {
          await syncAccountAnalytics(orgId, accountDoc.id);
          console.log(
            `Synced account analytics: org=${orgId} account=${accountDoc.id}`
          );
        } catch (error) {
          console.error(
            `Failed to sync account analytics: org=${orgId} account=${accountDoc.id}`,
            error
          );
        }
      }

      // Sync post-level analytics for recently published posts (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const postsSnapshot = await db
        .posts(orgId)
        .where("status", "==", "published")
        .get();

      for (const postDoc of postsSnapshot.docs) {
        const post = postDoc.data() as Post;
        const publishedAt = post.publishedAt?.toDate?.();
        if (publishedAt && publishedAt >= thirtyDaysAgo) {
          try {
            await syncPostAnalytics(orgId, postDoc.id);
            console.log(
              `Synced post analytics: org=${orgId} post=${postDoc.id}`
            );
          } catch (error) {
            console.error(
              `Failed to sync post analytics: org=${orgId} post=${postDoc.id}`,
              error
            );
          }
        }
      }

      // Aggregate into daily document
      try {
        await aggregateDailyAnalytics(orgId, today);
        console.log(`Aggregated daily analytics: org=${orgId} date=${today}`);
      } catch (error) {
        console.error(
          `Failed to aggregate daily analytics: org=${orgId}`,
          error
        );
      }

      // Roll up into monthly document
      try {
        await rollupMonthlyAnalytics(orgId, currentMonth);
        console.log(
          `Rolled up monthly analytics: org=${orgId} month=${currentMonth}`
        );
      } catch (error) {
        console.error(
          `Failed to rollup monthly analytics: org=${orgId}`,
          error
        );
      }
    } catch (error) {
      console.error(
        `Failed to process analytics for org ${orgId}:`,
        error
      );
    }
  }

  console.log("Analytics sync completed.");
}
