import axios from "axios";
import { Timestamp } from "firebase-admin/firestore";
import { SocialAccount } from "../types/index.js";

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || "";
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || "";
const TIKTOK_REDIRECT_URI = process.env.TIKTOK_REDIRECT_URI || "";

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_USER_INFO_URL = "https://open.tiktokapis.com/v2/user/info/";

export function getTikTokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_KEY,
    response_type: "code",
    scope: "user.info.basic,video.upload,video.publish",
    redirect_uri: TIKTOK_REDIRECT_URI,
    state,
  });

  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeTikTokCode(
  code: string
): Promise<Partial<SocialAccount>> {
  // Exchange code for access token
  const tokenResponse = await axios.post(
    TIKTOK_TOKEN_URL,
    new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: TIKTOK_REDIRECT_URI,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    open_id: openId,
  } = tokenResponse.data;

  // Get user info
  const userResponse = await axios.get(TIKTOK_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      fields: "open_id,union_id,avatar_url,display_name",
    },
  });

  const userData = userResponse.data.data.user;

  return {
    platform: "tiktok",
    accessToken,
    refreshToken,
    tokenExpiresAt: expiresIn
      ? Timestamp.fromDate(new Date(Date.now() + expiresIn * 1000))
      : null,
    platformUserId: openId,
    username: userData.display_name || openId,
    profileImage: userData.avatar_url || null,
  };
}

export async function refreshTikTokToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const response = await axios.post(
    TIKTOK_TOKEN_URL,
    new URLSearchParams({
      client_key: TIKTOK_CLIENT_KEY,
      client_secret: TIKTOK_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in,
  };
}

export async function publishToTikTok(
  accessToken: string,
  videoUrl: string,
  caption: string
): Promise<{ videoId: string }> {
  // Initialize video upload using PULL_FROM_URL (video hosted on Firebase Storage)
  const initResponse = await axios.post(
    "https://open.tiktokapis.com/v2/post/publish/video/init/",
    {
      post_info: {
        title: caption.substring(0, 150), // TikTok title limit
        privacy_level: "PUBLIC_TO_EVERYONE",
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: videoUrl,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (initResponse.data.error.code !== "ok") {
    throw new Error(
      `TikTok upload failed: ${initResponse.data.error.message}`
    );
  }

  const publishId = initResponse.data.data.publish_id;

  // Poll for publish status until complete or failed
  let status = "PROCESSING_UPLOAD";
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max wait (5s intervals)

  while (
    (status === "PROCESSING_UPLOAD" || status === "PROCESSING_DOWNLOAD") &&
    attempts < maxAttempts
  ) {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const statusResponse = await axios.post(
      "https://open.tiktokapis.com/v2/post/publish/status/fetch/",
      { publish_id: publishId },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (statusResponse.data.error.code !== "ok") {
      throw new Error(
        `TikTok status check failed: ${statusResponse.data.error.message}`
      );
    }

    status = statusResponse.data.data.status;
    attempts++;
  }

  if (status !== "PUBLISH_COMPLETE") {
    throw new Error(
      `TikTok publish failed with status: ${status}`
    );
  }

  return {
    videoId: publishId,
  };
}

export async function getTikTokVideoMetrics(
  accessToken: string,
  videoId: string
): Promise<{
  views: number;
  likes: number;
  comments: number;
  shares: number;
}> {
  const response = await axios.post(
    "https://open.tiktokapis.com/v2/video/query/",
    {
      filters: { video_ids: [videoId] },
      fields: ["like_count", "comment_count", "share_count", "view_count"],
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  const video = response.data?.data?.videos?.[0];
  if (!video) {
    return { views: 0, likes: 0, comments: 0, shares: 0 };
  }

  return {
    views: video.view_count || 0,
    likes: video.like_count || 0,
    comments: video.comment_count || 0,
    shares: video.share_count || 0,
  };
}

export async function getTikTokUserMetrics(
  accessToken: string,
  openId: string
): Promise<{
  followerCount: number;
  followingCount: number;
  likesCount: number;
  videoCount: number;
}> {
  const response = await axios.get(TIKTOK_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      fields: "open_id,follower_count,following_count,likes_count,video_count",
    },
  });

  const user = response.data?.data?.user;
  if (!user) {
    return { followerCount: 0, followingCount: 0, likesCount: 0, videoCount: 0 };
  }

  return {
    followerCount: user.follower_count || 0,
    followingCount: user.following_count || 0,
    likesCount: user.likes_count || 0,
    videoCount: user.video_count || 0,
  };
}
