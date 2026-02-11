import cron from "node-cron";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../services/firebase.js";
import { publishPost } from "../services/publisher.js";
import { ScheduledJob, SocialAccount } from "../types/index.js";
import { refreshTikTokToken } from "../services/tiktok.js";
import { refreshInstagramToken } from "../services/instagram.js";

let schedulerRunning = false;

export function startScheduler(): void {
  if (schedulerRunning) {
    console.log("Scheduler already running");
    return;
  }

  console.log("Starting post scheduler...");
  schedulerRunning = true;

  // Run every minute to check for scheduled posts
  cron.schedule("* * * * *", async () => {
    await processScheduledJobs();
  });

  // Run every hour to refresh tokens
  cron.schedule("0 * * * *", async () => {
    await refreshExpiredTokens();
  });

  console.log("Scheduler started successfully");
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

    // Get all organizations
    const orgsSnapshot = await db.organizations().get();

    for (const orgDoc of orgsSnapshot.docs) {
      // Get accounts with tokens expiring soon
      const accountsSnapshot = await db
        .socialAccounts(orgDoc.id)
        .where("tokenExpiresAt", "<=", oneHourFromNow)
        .where("tokenExpiresAt", ">", now)
        .get();

      for (const accountDoc of accountsSnapshot.docs) {
        try {
          const account = accountDoc.data() as SocialAccount;

          if (account.platform === "tiktok" && account.refreshToken) {
            const result = await refreshTikTokToken(account.refreshToken);
            await accountDoc.ref.update({
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              tokenExpiresAt: Timestamp.fromDate(
                new Date(Date.now() + result.expiresIn * 1000)
              ),
              lastSyncAt: Timestamp.now(),
            });
            console.log(`Refreshed TikTok token for account ${accountDoc.id}`);
          } else if (account.platform === "instagram") {
            const result = await refreshInstagramToken(account.accessToken);
            await accountDoc.ref.update({
              accessToken: result.accessToken,
              tokenExpiresAt: Timestamp.fromDate(
                new Date(Date.now() + result.expiresIn * 1000)
              ),
              lastSyncAt: Timestamp.now(),
            });
            console.log(`Refreshed Instagram token for account ${accountDoc.id}`);
          } else {
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
    }
  } catch (error) {
    console.error("Error refreshing tokens:", error);
  }
}
