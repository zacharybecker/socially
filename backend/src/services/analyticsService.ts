import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";
import {
  DailyMetrics,
  PlatformBreakdown,
  PostAnalyticsSnapshot,
  TopPost,
  SocialAccount,
  Post,
  Platform,
} from "../types/index.js";
import { getTikTokVideoMetrics, getTikTokUserMetrics } from "./tiktok.js";
import { getInstagramInsights, getInstagramAccountInsights } from "./instagram.js";

function emptyPlatformBreakdown(): PlatformBreakdown {
  return {
    impressions: 0,
    reach: 0,
    engagements: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    videoViews: 0,
    followers: 0,
    followerChange: 0,
  };
}

function emptyDailyMetrics(date: string): DailyMetrics {
  return {
    date,
    impressions: 0,
    reach: 0,
    engagements: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    videoViews: 0,
    followers: 0,
    followerChange: 0,
    engagementRate: 0,
    postsPublished: 0,
    platformBreakdown: {},
  };
}

/**
 * Sync metrics from platform API for a single social account.
 */
export async function syncAccountAnalytics(
  orgId: string,
  accountId: string
): Promise<void> {
  const accountDoc = await db.socialAccount(orgId, accountId).get();
  if (!accountDoc.exists) {
    throw new Error(`Account ${accountId} not found in org ${orgId}`);
  }

  const account = accountDoc.data() as SocialAccount;
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  let metrics: Partial<PlatformBreakdown> & { followers?: number } = {};

  if (account.platform === "tiktok") {
    const userMetrics = await getTikTokUserMetrics(
      account.accessToken,
      account.platformUserId
    );
    metrics = {
      followers: userMetrics.followerCount,
      likes: userMetrics.likesCount,
    };
  } else if (account.platform === "instagram") {
    const accountInsights = await getInstagramAccountInsights(
      account.accessToken,
      account.platformUserId,
      "day"
    );
    metrics = {
      impressions: accountInsights.impressions,
      reach: accountInsights.reach,
      followers: accountInsights.followerCount,
    };
  }

  // Get previous snapshot to compute follower change
  const previousSnapshots = await db
    .accountAnalytics(orgId, accountId)
    .orderBy("date", "desc")
    .limit(1)
    .get();

  const previousFollowers = previousSnapshots.empty
    ? metrics.followers || 0
    : (previousSnapshots.docs[0].data().followers || 0);
  const followerChange = (metrics.followers || 0) - previousFollowers;

  // Store account analytics snapshot
  await db.accountAnalyticsDoc(orgId, accountId, today).set(
    {
      date: today,
      platform: account.platform,
      impressions: metrics.impressions || 0,
      reach: metrics.reach || 0,
      engagements: metrics.engagements || 0,
      likes: metrics.likes || 0,
      comments: metrics.comments || 0,
      shares: metrics.shares || 0,
      saves: metrics.saves || 0,
      videoViews: metrics.videoViews || 0,
      followers: metrics.followers || 0,
      followerChange,
      syncedAt: Timestamp.now(),
    },
    { merge: true }
  );

  // Update lastSyncAt on the account
  await db.socialAccount(orgId, accountId).update({
    lastSyncAt: Timestamp.now(),
  });
}

/**
 * Sync post-level metrics from platform APIs.
 */
export async function syncPostAnalytics(
  orgId: string,
  postId: string
): Promise<void> {
  const postDoc = await db.post(orgId, postId).get();
  if (!postDoc.exists) {
    throw new Error(`Post ${postId} not found in org ${orgId}`);
  }

  const post = postDoc.data() as Post;
  if (post.status !== "published") {
    return; // Only sync published posts
  }

  for (const platformEntry of post.platforms) {
    if (
      platformEntry.status !== "published" ||
      !platformEntry.platformPostId
    ) {
      continue;
    }

    const accountDoc = await db
      .socialAccount(orgId, platformEntry.accountId)
      .get();
    if (!accountDoc.exists) continue;

    const account = accountDoc.data() as SocialAccount;
    let snapshot: Partial<PostAnalyticsSnapshot> = {};

    if (account.platform === "tiktok") {
      const videoMetrics = await getTikTokVideoMetrics(
        account.accessToken,
        platformEntry.platformPostId
      );
      snapshot = {
        impressions: videoMetrics.views,
        reach: videoMetrics.views,
        likes: videoMetrics.likes,
        comments: videoMetrics.comments,
        shares: videoMetrics.shares,
        saves: 0,
        videoViews: videoMetrics.views,
        engagements:
          videoMetrics.likes + videoMetrics.comments + videoMetrics.shares,
      };
    } else if (account.platform === "instagram") {
      const mediaMetrics = await getInstagramInsights(
        account.accessToken,
        platformEntry.platformPostId
      );
      snapshot = {
        impressions: mediaMetrics.impressions,
        reach: mediaMetrics.reach,
        likes: mediaMetrics.likes,
        comments: mediaMetrics.comments,
        shares: mediaMetrics.shares,
        saves: mediaMetrics.saves,
        videoViews: mediaMetrics.videoViews,
        engagements: mediaMetrics.engagements,
      };
    }

    const totalEngagements =
      (snapshot.likes || 0) +
      (snapshot.comments || 0) +
      (snapshot.shares || 0) +
      (snapshot.saves || 0);
    const engagementRate =
      snapshot.impressions && snapshot.impressions > 0
        ? (totalEngagements / snapshot.impressions) * 100
        : 0;

    const snapshotId = `${platformEntry.accountId}_${new Date().toISOString().split("T")[0]}`;
    await db.postAnalyticsDoc(orgId, postId, snapshotId).set({
      postId,
      accountId: platformEntry.accountId,
      platform: account.platform,
      impressions: snapshot.impressions || 0,
      reach: snapshot.reach || 0,
      engagements: snapshot.engagements || 0,
      likes: snapshot.likes || 0,
      comments: snapshot.comments || 0,
      shares: snapshot.shares || 0,
      saves: snapshot.saves || 0,
      videoViews: snapshot.videoViews || 0,
      engagementRate: Math.round(engagementRate * 100) / 100,
      snapshotAt: Timestamp.now(),
    });
  }
}

/**
 * Aggregate account-level snapshots into an org-level daily metrics document.
 */
export async function aggregateDailyAnalytics(
  orgId: string,
  date: string
): Promise<void> {
  // Get all social accounts for the org
  const accountsSnapshot = await db.socialAccounts(orgId).get();
  const daily = emptyDailyMetrics(date);

  for (const accountDoc of accountsSnapshot.docs) {
    const account = accountDoc.data() as SocialAccount;
    const analyticsDoc = await db
      .accountAnalyticsDoc(orgId, accountDoc.id, date)
      .get();

    if (!analyticsDoc.exists) continue;

    const data = analyticsDoc.data()!;
    const platform = account.platform;

    if (!daily.platformBreakdown[platform]) {
      daily.platformBreakdown[platform] = emptyPlatformBreakdown();
    }

    const pb = daily.platformBreakdown[platform];

    // Accumulate into platform breakdown
    pb.impressions += data.impressions || 0;
    pb.reach += data.reach || 0;
    pb.engagements += data.engagements || 0;
    pb.likes += data.likes || 0;
    pb.comments += data.comments || 0;
    pb.shares += data.shares || 0;
    pb.saves += data.saves || 0;
    pb.videoViews += data.videoViews || 0;
    pb.followers += data.followers || 0;
    pb.followerChange += data.followerChange || 0;

    // Accumulate into daily totals
    daily.impressions += data.impressions || 0;
    daily.reach += data.reach || 0;
    daily.engagements += data.engagements || 0;
    daily.likes += data.likes || 0;
    daily.comments += data.comments || 0;
    daily.shares += data.shares || 0;
    daily.saves += data.saves || 0;
    daily.videoViews += data.videoViews || 0;
    daily.followers += data.followers || 0;
    daily.followerChange += data.followerChange || 0;
  }

  // Count posts published on this date
  const dayStart = Timestamp.fromDate(new Date(`${date}T00:00:00Z`));
  const dayEnd = Timestamp.fromDate(new Date(`${date}T23:59:59.999Z`));

  const publishedPosts = await db
    .posts(orgId)
    .where("publishedAt", ">=", dayStart)
    .where("publishedAt", "<=", dayEnd)
    .get();

  daily.postsPublished = publishedPosts.size;

  // Compute engagement rate
  const totalEngagements =
    daily.likes + daily.comments + daily.shares + daily.saves;
  daily.engagementRate =
    daily.impressions > 0
      ? Math.round((totalEngagements / daily.impressions) * 10000) / 100
      : 0;

  await db.analyticsDailyDoc(orgId, date).set(daily, { merge: true });
}

/**
 * Roll up daily documents into a monthly aggregate.
 */
export async function rollupMonthlyAnalytics(
  orgId: string,
  month: string // YYYY-MM
): Promise<void> {
  const dailySnapshot = await db
    .analyticsDaily(orgId)
    .where("date", ">=", `${month}-01`)
    .where("date", "<=", `${month}-31`)
    .get();

  const monthly = {
    month,
    impressions: 0,
    reach: 0,
    engagements: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    videoViews: 0,
    followers: 0,
    followerChange: 0,
    engagementRate: 0,
    postsPublished: 0,
    daysWithData: 0,
    platformBreakdown: {} as Record<string, PlatformBreakdown>,
  };

  for (const doc of dailySnapshot.docs) {
    const data = doc.data() as DailyMetrics;
    monthly.impressions += data.impressions || 0;
    monthly.reach += data.reach || 0;
    monthly.engagements += data.engagements || 0;
    monthly.likes += data.likes || 0;
    monthly.comments += data.comments || 0;
    monthly.shares += data.shares || 0;
    monthly.saves += data.saves || 0;
    monthly.videoViews += data.videoViews || 0;
    monthly.followerChange += data.followerChange || 0;
    monthly.postsPublished += data.postsPublished || 0;
    monthly.daysWithData++;

    // Use the latest follower count
    if (data.followers > monthly.followers) {
      monthly.followers = data.followers;
    }

    // Merge platform breakdowns
    for (const [platform, pb] of Object.entries(data.platformBreakdown || {})) {
      if (!monthly.platformBreakdown[platform]) {
        monthly.platformBreakdown[platform] = emptyPlatformBreakdown();
      }
      const mpb = monthly.platformBreakdown[platform];
      mpb.impressions += pb.impressions || 0;
      mpb.reach += pb.reach || 0;
      mpb.engagements += pb.engagements || 0;
      mpb.likes += pb.likes || 0;
      mpb.comments += pb.comments || 0;
      mpb.shares += pb.shares || 0;
      mpb.saves += pb.saves || 0;
      mpb.videoViews += pb.videoViews || 0;
      mpb.followerChange += pb.followerChange || 0;
      if (pb.followers > mpb.followers) {
        mpb.followers = pb.followers;
      }
    }
  }

  // Compute engagement rate
  const totalEngagements =
    monthly.likes + monthly.comments + monthly.shares + monthly.saves;
  monthly.engagementRate =
    monthly.impressions > 0
      ? Math.round((totalEngagements / monthly.impressions) * 10000) / 100
      : 0;

  await db.analyticsMonthlyDoc(orgId, month).set(monthly, { merge: true });
}

/**
 * Query and aggregate analytics for an overview period.
 */
export async function getAnalyticsOverview(
  orgId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalImpressions: number;
  totalReach: number;
  totalEngagements: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalVideoViews: number;
  totalFollowers: number;
  followerChange: number;
  engagementRate: number;
  postsPublished: number;
  period: { start: string; end: string };
}> {
  const snapshot = await db
    .analyticsDaily(orgId)
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .orderBy("date", "asc")
    .get();

  const overview = {
    totalImpressions: 0,
    totalReach: 0,
    totalEngagements: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0,
    totalSaves: 0,
    totalVideoViews: 0,
    totalFollowers: 0,
    followerChange: 0,
    engagementRate: 0,
    postsPublished: 0,
    period: { start: startDate, end: endDate },
  };

  for (const doc of snapshot.docs) {
    const data = doc.data() as DailyMetrics;
    overview.totalImpressions += data.impressions || 0;
    overview.totalReach += data.reach || 0;
    overview.totalEngagements += data.engagements || 0;
    overview.totalLikes += data.likes || 0;
    overview.totalComments += data.comments || 0;
    overview.totalShares += data.shares || 0;
    overview.totalSaves += data.saves || 0;
    overview.totalVideoViews += data.videoViews || 0;
    overview.followerChange += data.followerChange || 0;
    overview.postsPublished += data.postsPublished || 0;

    // Use latest follower count
    if (data.followers > overview.totalFollowers) {
      overview.totalFollowers = data.followers;
    }
  }

  const totalEngagements =
    overview.totalLikes +
    overview.totalComments +
    overview.totalShares +
    overview.totalSaves;
  overview.engagementRate =
    overview.totalImpressions > 0
      ? Math.round((totalEngagements / overview.totalImpressions) * 10000) / 100
      : 0;

  return overview;
}

/**
 * Get top-performing posts for a date range.
 */
export async function getTopPosts(
  orgId: string,
  startDate: string,
  endDate: string,
  limit: number = 10,
  sortBy: "engagements" | "impressions" | "engagementRate" = "engagements"
): Promise<TopPost[]> {
  const start = Timestamp.fromDate(new Date(`${startDate}T00:00:00Z`));
  const end = Timestamp.fromDate(new Date(`${endDate}T23:59:59.999Z`));

  const postsSnapshot = await db
    .posts(orgId)
    .where("status", "==", "published")
    .where("publishedAt", ">=", start)
    .where("publishedAt", "<=", end)
    .get();

  const topPosts: TopPost[] = [];

  for (const postDoc of postsSnapshot.docs) {
    const post = postDoc.data() as Post;

    // Get latest analytics snapshot for this post
    const analyticsSnapshot = await db
      .postAnalytics(orgId, postDoc.id)
      .orderBy("snapshotAt", "desc")
      .limit(1)
      .get();

    if (analyticsSnapshot.empty) continue;

    const analytics = analyticsSnapshot.docs[0].data();

    // Determine the primary platform from the first published platform entry
    const publishedPlatform = post.platforms.find(
      (p) => p.status === "published"
    );
    let platform: Platform = "tiktok";
    if (publishedPlatform) {
      const accountDoc = await db
        .socialAccount(orgId, publishedPlatform.accountId)
        .get();
      if (accountDoc.exists) {
        platform = (accountDoc.data() as SocialAccount).platform;
      }
    }

    topPosts.push({
      postId: postDoc.id,
      content: post.content.substring(0, 200),
      platform,
      publishedAt: post.publishedAt!,
      impressions: analytics.impressions || 0,
      engagements: analytics.engagements || 0,
      engagementRate: analytics.engagementRate || 0,
      likes: analytics.likes || 0,
      comments: analytics.comments || 0,
      shares: analytics.shares || 0,
    });
  }

  // Sort by the requested metric
  topPosts.sort((a, b) => b[sortBy] - a[sortBy]);

  return topPosts.slice(0, limit);
}

/**
 * Get analytics for a specific account over a date range.
 */
export async function getAccountAnalytics(
  orgId: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<{
  snapshots: Array<Record<string, unknown>>;
  summary: PlatformBreakdown & { followerChange: number };
}> {
  const snapshot = await db
    .accountAnalytics(orgId, accountId)
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .orderBy("date", "asc")
    .get();

  const summary: PlatformBreakdown & { followerChange: number } = {
    ...emptyPlatformBreakdown(),
    followerChange: 0,
  };

  const snapshots = snapshot.docs.map((doc) => {
    const data = doc.data();
    summary.impressions += data.impressions || 0;
    summary.reach += data.reach || 0;
    summary.engagements += data.engagements || 0;
    summary.likes += data.likes || 0;
    summary.comments += data.comments || 0;
    summary.shares += data.shares || 0;
    summary.saves += data.saves || 0;
    summary.videoViews += data.videoViews || 0;
    summary.followerChange += data.followerChange || 0;

    if (data.followers > summary.followers) {
      summary.followers = data.followers;
    }

    return { id: doc.id, ...data };
  });

  return { snapshots, summary };
}

/**
 * Get all analytics snapshots for a specific post.
 */
export async function getPostAnalytics(
  orgId: string,
  postId: string
): Promise<Array<Record<string, unknown>>> {
  const snapshot = await db
    .postAnalytics(orgId, postId)
    .orderBy("snapshotAt", "asc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      snapshotAt: data.snapshotAt?.toDate?.()?.toISOString() || data.snapshotAt,
    };
  });
}
