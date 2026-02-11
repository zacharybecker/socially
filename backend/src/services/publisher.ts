import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";
import { Post, SocialAccount, PostPlatform } from "../types/index.js";
import { publishToTikTok } from "./tiktok.js";
import { publishToInstagram } from "./instagram.js";

export async function publishPost(
  orgId: string,
  postId: string
): Promise<void> {
  const postDoc = await db.post(orgId, postId).get();

  if (!postDoc.exists) {
    throw new Error("Post not found");
  }

  const post = postDoc.data() as Post;
  const updatedPlatforms: PostPlatform[] = [];
  let allSucceeded = true;
  let anySucceeded = false;

  // Batch-fetch all accounts upfront to avoid N+1
  const accountDocs = await Promise.all(
    post.platforms.map((p) => db.socialAccount(orgId, p.accountId).get())
  );
  const accountMap = new Map(
    accountDocs.map((doc) => [doc.id, doc])
  );

  for (const platform of post.platforms) {
    const accountDoc = accountMap.get(platform.accountId);

    if (!accountDoc || !accountDoc.exists) {
      updatedPlatforms.push({
        ...platform,
        status: "failed",
        errorMessage: "Account not found",
      });
      allSucceeded = false;
      continue;
    }

    const account = accountDoc.data() as SocialAccount;

    try {
      let platformPostId: string | null = null;

      switch (account.platform) {
        case "tiktok":
          if (post.mediaUrls.length > 0) {
            const result = await publishToTikTok(
              account.accessToken,
              post.mediaUrls[0],
              post.content
            );
            platformPostId = result.videoId;
          } else {
            throw new Error("TikTok requires a video");
          }
          break;

        case "instagram":
          if (post.mediaUrls.length > 0) {
            const mediaUrl = post.mediaUrls[0];
            const isVideo =
              mediaUrl.includes(".mp4") ||
              mediaUrl.includes(".mov") ||
              mediaUrl.includes(".webm");
            
            const result = await publishToInstagram(
              account.accessToken,
              account.platformUserId,
              mediaUrl,
              post.content,
              isVideo ? "REELS" : "IMAGE"
            );
            platformPostId = result.mediaId;
          } else {
            throw new Error("Instagram requires media");
          }
          break;

        default:
          throw new Error(`Platform ${account.platform} is not supported`);
      }

      updatedPlatforms.push({
        ...platform,
        status: "published",
        platformPostId,
        errorMessage: null,
      });
      anySucceeded = true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      
      updatedPlatforms.push({
        ...platform,
        status: "failed",
        errorMessage,
      });
      allSucceeded = false;
    }
  }

  // Update post status
  const finalStatus = allSucceeded
    ? "published"
    : anySucceeded
    ? "published" // Partial success still counts as published
    : "failed";

  await db.post(orgId, postId).update({
    status: finalStatus,
    platforms: updatedPlatforms,
    publishedAt: anySucceeded ? Timestamp.now() : null,
    updatedAt: Timestamp.now(),
  });
}
