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
  // TikTok's Content Posting API requires multiple steps:
  // 1. Initialize upload
  // 2. Upload video chunks
  // 3. Create post
  
  // This is a simplified version - full implementation requires handling
  // video upload chunks and post creation
  
  // Initialize video upload
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

  return {
    videoId: initResponse.data.data.publish_id,
  };
}
