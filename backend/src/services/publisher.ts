import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase.js";
import { Post, SocialAccount, PostPlatform, Platform } from "../types/index.js";
import { publishToTikTok } from "./tiktok.js";
import { publishToInstagram } from "./instagram.js";
import { publishToYouTube } from "./youtube.js";
import { publishToTwitter, uploadTwitterMedia } from "./twitter.js";
import { publishToFacebook } from "./facebook.js";
import { publishToLinkedIn } from "./linkedin.js";
import { publishToThreads } from "./threads.js";
import { publishToPinterest } from "./pinterest.js";

interface PlatformPublisher {
  publish(
    accessToken: string,
    account: SocialAccount,
    post: Post
  ): Promise<{ platformPostId: string }>;
}

const publishers: Record<Platform, PlatformPublisher> = {
  tiktok: {
    async publish(accessToken, _account, post) {
      if (post.mediaUrls.length === 0) {
        throw new Error("TikTok requires a video");
      }
      const result = await publishToTikTok(
        accessToken,
        post.mediaUrls[0],
        post.content
      );
      return { platformPostId: result.videoId };
    },
  },

  instagram: {
    async publish(accessToken, account, post) {
      if (post.mediaUrls.length === 0) {
        throw new Error("Instagram requires media");
      }
      const mediaUrl = post.mediaUrls[0];
      const isVideo =
        mediaUrl.includes(".mp4") ||
        mediaUrl.includes(".mov") ||
        mediaUrl.includes(".webm");

      const result = await publishToInstagram(
        accessToken,
        account.platformUserId,
        mediaUrl,
        post.content,
        isVideo ? "REELS" : "IMAGE"
      );
      return { platformPostId: result.mediaId };
    },
  },

  youtube: {
    async publish(accessToken, _account, post) {
      if (post.mediaUrls.length === 0) {
        throw new Error("YouTube requires a video");
      }
      const result = await publishToYouTube(
        accessToken,
        post.mediaUrls[0],
        post.content.substring(0, 100),
        post.content,
        [],
        "public"
      );
      return { platformPostId: result.videoId };
    },
  },

  twitter: {
    async publish(accessToken, _account, post) {
      let mediaIds: string[] | undefined;

      if (post.mediaUrls.length > 0) {
        mediaIds = [];
        for (const url of post.mediaUrls.slice(0, 4)) {
          const result = await uploadTwitterMedia(accessToken, url);
          mediaIds.push(result.mediaId);
        }
      }

      const result = await publishToTwitter(
        accessToken,
        post.content,
        mediaIds
      );
      return { platformPostId: result.tweetId };
    },
  },

  facebook: {
    async publish(accessToken, account, post) {
      const mediaUrl = post.mediaUrls[0] || undefined;
      let mediaType: "image" | "video" | undefined;

      if (mediaUrl) {
        const isVideo =
          mediaUrl.includes(".mp4") ||
          mediaUrl.includes(".mov") ||
          mediaUrl.includes(".webm");
        mediaType = isVideo ? "video" : "image";
      }

      const result = await publishToFacebook(
        accessToken,
        account.platformUserId,
        post.content,
        mediaUrl,
        mediaType
      );
      return { platformPostId: result.postId };
    },
  },

  linkedin: {
    async publish(accessToken, account, post) {
      const mediaUrl = post.mediaUrls[0] || undefined;
      let mediaType: "image" | "video" | undefined;

      if (mediaUrl) {
        const isVideo =
          mediaUrl.includes(".mp4") ||
          mediaUrl.includes(".mov") ||
          mediaUrl.includes(".webm");
        mediaType = isVideo ? "video" : "image";
      }

      const result = await publishToLinkedIn(
        accessToken,
        account.platformUserId,
        post.content,
        mediaUrl,
        mediaType
      );
      return { platformPostId: result.postUrn };
    },
  },

  threads: {
    async publish(accessToken, account, post) {
      const mediaUrl = post.mediaUrls[0] || undefined;
      let mediaType: "IMAGE" | "VIDEO" | undefined;

      if (mediaUrl) {
        const isVideo =
          mediaUrl.includes(".mp4") ||
          mediaUrl.includes(".mov") ||
          mediaUrl.includes(".webm");
        mediaType = isVideo ? "VIDEO" : "IMAGE";
      }

      const result = await publishToThreads(
        accessToken,
        account.platformUserId,
        post.content,
        mediaUrl,
        mediaType
      );
      return { platformPostId: result.threadId };
    },
  },

  pinterest: {
    async publish(accessToken, _account, post) {
      if (post.mediaUrls.length === 0) {
        throw new Error("Pinterest requires an image");
      }
      const pinterestPlatform = post.platforms.find(
        (p) => p.accountId === _account.id
      );
      const boardId = pinterestPlatform?.metadata?.pinterestBoardId as string | undefined;
      if (!boardId) {
        throw new Error(
          "Pinterest requires a board to be selected. Please edit the post and choose a Pinterest board."
        );
      }
      const result = await publishToPinterest(
        accessToken,
        boardId,
        post.content.substring(0, 100),
        post.content,
        post.mediaUrls[0]
      );
      return { platformPostId: result.pinId };
    },
  },
};

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
      const publisher = publishers[account.platform];
      if (!publisher) {
        throw new Error(`Platform ${account.platform} is not supported`);
      }

      const result = await publisher.publish(
        account.accessToken,
        account,
        post
      );

      updatedPlatforms.push({
        ...platform,
        status: "published",
        platformPostId: result.platformPostId,
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
