import cron from "node-cron";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../services/firebase.js";
import { publishPost } from "../services/publisher.js";
import { ScheduledJob, SocialAccount } from "../types/index.js";
import { refreshTikTokToken } from "../services/tiktok.js";
import { refreshInstagramToken } from "../services/instagram.js";
import { refreshYouTubeToken } from "../services/youtube.js";
import { refreshTwitterToken } from "../services/twitter.js";
import { refreshFacebookToken } from "../services/facebook.js";
import { refreshLinkedInToken } from "../services/linkedin.js";
import { refreshThreadsToken } from "../services/threads.js";
import { refreshPinterestToken } from "../services/pinterest.js";
import { resetMonthlyUsage } from "../services/usage.js";

import { syncAllAnalytics } from "./analyticsSyncer.js";
import { generateAllSuggestions } from "../services/ai-suggestions.js";

let schedulerRunning = false;
let postSchedulerTask: cron.ScheduledTask | null = null;
let tokenRefreshTask: cron.ScheduledTask | null = null;
let analyticsSyncTask: cron.ScheduledTask | null = null;
let usageResetTask: cron.ScheduledTask | null = null;
let aiSuggestionsTask: cron.ScheduledTask | null = null;

export function startScheduler(): void {
  if (schedulerRunning) {
    console.log("Scheduler already running");
    return;
  }

  console.log("Starting post scheduler...");
  schedulerRunning = true;

  // Run every minute to check for scheduled posts
  postSchedulerTask = cron.schedule("* * * * *", async () => {
    await processScheduledJobs();
  });

  // Run every hour to refresh tokens
  tokenRefreshTask = cron.schedule("0 * * * *", async () => {
    await refreshExpiredTokens();
  });

  // Run every 6 hours to sync analytics
  analyticsSyncTask = cron.schedule("0 */6 * * *", async () => {
    await syncAllAnalytics();
  });

  // Run on the 1st of each month at midnight to reset usage counters
  usageResetTask = cron.schedule("0 0 1 * *", async () => {
    await resetMonthlyUsage();
  });

  // Run daily at 6am to generate AI suggestions for all orgs
  aiSuggestionsTask = cron.schedule("0 6 * * *", async () => {
    await generateDailyAISuggestions();
  });

  console.log("Scheduler started successfully");
}

export function stopScheduler(): void {
  if (!schedulerRunning) return;

  console.log("Stopping scheduler...");
  postSchedulerTask?.stop();
  tokenRefreshTask?.stop();
  analyticsSyncTask?.stop();
  usageResetTask?.stop();
  aiSuggestionsTask?.stop();
  postSchedulerTask = null;
  tokenRefreshTask = null;
  analyticsSyncTask = null;
  usageResetTask = null;
  aiSuggestionsTask = null;
  schedulerRunning = false;
  console.log("Scheduler stopped");
}

async function processScheduledJobs(): Promise<void> {
  try {
    const now = Timestamp.now();

    // Get pending jobs that are due
    const jobsSnapshot = await db
      .scheduledJobs()
      .where("status", "==", "pending")
      .where("scheduledAt", "<=", now)
      .limit(10) // Process in batches
      .get();

    if (jobsSnapshot.empty) {
      return;
    }

    console.log(`Processing ${jobsSnapshot.size} scheduled jobs...`);

    for (const jobDoc of jobsSnapshot.docs) {
      const job = jobDoc.data() as ScheduledJob;

      try {
        // Mark as processing
        await jobDoc.ref.update({
          status: "processing",
          processedAt: Timestamp.now(),
        });

        // Publish the post
        await publishPost(job.orgId, job.postId);

        // Mark as completed
        await jobDoc.ref.update({
          status: "completed",
        });

        console.log(`Successfully published scheduled post: ${job.postId}`);
      } catch (error) {
        console.error(`Failed to publish scheduled post ${job.postId}:`, error);

        // Mark as failed
        await jobDoc.ref.update({
          status: "failed",
        });
      }
    }
  } catch (error) {
    console.error("Error processing scheduled jobs:", error);
  }
}

async function refreshExpiredTokens(): Promise<void> {
  try {
    const now = Timestamp.now();
    const oneHourFromNow = Timestamp.fromDate(
      new Date(Date.now() + 60 * 60 * 1000)
    );

    // Single collectionGroup query instead of N+1 per-org queries
    const accountsSnapshot = await db
      .socialAccountsGroup()
      .where("tokenExpiresAt", "<=", oneHourFromNow)
      .where("tokenExpiresAt", ">", now)
      .get();

    for (const accountDoc of accountsSnapshot.docs) {
      try {
        const account = accountDoc.data() as SocialAccount;

        switch (account.platform) {
          case "tiktok":
            if (account.refreshToken) {
              const tiktokResult = await refreshTikTokToken(account.refreshToken);
              await accountDoc.ref.update({
                accessToken: tiktokResult.accessToken,
                refreshToken: tiktokResult.refreshToken,
                tokenExpiresAt: Timestamp.fromDate(
                  new Date(Date.now() + tiktokResult.expiresIn * 1000)
                ),
                lastSyncAt: Timestamp.now(),
              });
              console.log(`Refreshed TikTok token for account ${accountDoc.id}`);
            }
            break;

          case "instagram": {
            const igResult = await refreshInstagramToken(account.accessToken);
            await accountDoc.ref.update({
              accessToken: igResult.accessToken,
              tokenExpiresAt: Timestamp.fromDate(
                new Date(Date.now() + igResult.expiresIn * 1000)
              ),
              lastSyncAt: Timestamp.now(),
            });
            console.log(`Refreshed Instagram token for account ${accountDoc.id}`);
            break;
          }

          case "youtube":
            if (account.refreshToken) {
              const ytResult = await refreshYouTubeToken(account.refreshToken);
              await accountDoc.ref.update({
                accessToken: ytResult.accessToken,
                tokenExpiresAt: Timestamp.fromDate(
                  new Date(Date.now() + ytResult.expiresIn * 1000)
                ),
                lastSyncAt: Timestamp.now(),
              });
              console.log(`Refreshed YouTube token for account ${accountDoc.id}`);
            }
            break;

          case "twitter":
            if (account.refreshToken) {
              const twResult = await refreshTwitterToken(account.refreshToken);
              await accountDoc.ref.update({
                accessToken: twResult.accessToken,
                refreshToken: twResult.refreshToken,
                tokenExpiresAt: Timestamp.fromDate(
                  new Date(Date.now() + twResult.expiresIn * 1000)
                ),
                lastSyncAt: Timestamp.now(),
              });
              console.log(`Refreshed Twitter token for account ${accountDoc.id}`);
            }
            break;

          case "facebook": {
            const fbResult = await refreshFacebookToken(account.accessToken);
            await accountDoc.ref.update({
              accessToken: fbResult.accessToken,
              tokenExpiresAt: Timestamp.fromDate(
                new Date(Date.now() + fbResult.expiresIn * 1000)
              ),
              lastSyncAt: Timestamp.now(),
            });
            console.log(`Refreshed Facebook token for account ${accountDoc.id}`);
            break;
          }

          case "linkedin":
            if (account.refreshToken) {
              const liResult = await refreshLinkedInToken(account.refreshToken);
              await accountDoc.ref.update({
                accessToken: liResult.accessToken,
                refreshToken: liResult.refreshToken,
                tokenExpiresAt: Timestamp.fromDate(
                  new Date(Date.now() + liResult.expiresIn * 1000)
                ),
                lastSyncAt: Timestamp.now(),
              });
              console.log(`Refreshed LinkedIn token for account ${accountDoc.id}`);
            }
            break;

          case "threads": {
            const thResult = await refreshThreadsToken(account.accessToken);
            await accountDoc.ref.update({
              accessToken: thResult.accessToken,
              tokenExpiresAt: Timestamp.fromDate(
                new Date(Date.now() + thResult.expiresIn * 1000)
              ),
              lastSyncAt: Timestamp.now(),
            });
            console.log(`Refreshed Threads token for account ${accountDoc.id}`);
            break;
          }

          case "pinterest":
            if (account.refreshToken) {
              const pinResult = await refreshPinterestToken(account.refreshToken);
              await accountDoc.ref.update({
                accessToken: pinResult.accessToken,
                refreshToken: pinResult.refreshToken,
                tokenExpiresAt: Timestamp.fromDate(
                  new Date(Date.now() + pinResult.expiresIn * 1000)
                ),
                lastSyncAt: Timestamp.now(),
              });
              console.log(`Refreshed Pinterest token for account ${accountDoc.id}`);
            }
            break;

          default:
            console.warn(
              `Cannot refresh token for account ${accountDoc.id} (${account.platform}): unsupported platform or missing refresh token`
            );
        }
      } catch (error) {
        console.error(
          `Failed to refresh token for account ${accountDoc.id}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Error refreshing tokens:", error);
  }
}

async function generateDailyAISuggestions(): Promise<void> {
  try {
    console.log("Generating daily AI suggestions for all organizations...");

    const orgsSnapshot = await db.organizations().get();

    for (const orgDoc of orgsSnapshot.docs) {
      try {
        await generateAllSuggestions(orgDoc.id);
        console.log(`Generated AI suggestions for org ${orgDoc.id}`);
      } catch (error) {
        console.error(`Failed to generate AI suggestions for org ${orgDoc.id}:`, error);
      }
    }

    console.log("Daily AI suggestions generation complete");
  } catch (error) {
    console.error("Error generating daily AI suggestions:", error);
  }
}
