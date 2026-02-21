import axios from "axios";
import { Timestamp } from "firebase-admin/firestore";
import { SocialAccount } from "../types/index.js";

const YOUTUBE_CLIENT_ID = process.env.YOUTUBE_CLIENT_ID || "";
const YOUTUBE_CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET || "";
const YOUTUBE_REDIRECT_URI = process.env.YOUTUBE_REDIRECT_URI || "";

const YOUTUBE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const YOUTUBE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";
const YOUTUBE_UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";
const YOUTUBE_ANALYTICS_URL = "https://youtubeanalytics.googleapis.com/v2/reports";

export function getYouTubeAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: YOUTUBE_CLIENT_ID,
    redirect_uri: YOUTUBE_REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${YOUTUBE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeYouTubeCode(
  code: string
): Promise<Partial<SocialAccount>> {
  // Exchange code for tokens
  const tokenResponse = await axios.post(
    YOUTUBE_TOKEN_URL,
    new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: YOUTUBE_REDIRECT_URI,
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
  } = tokenResponse.data;

  // Get channel info
  const channelResponse = await axios.get(`${YOUTUBE_API_URL}/channels`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      part: "snippet,statistics",
      mine: true,
    },
  });

  const channel = channelResponse.data.items?.[0];

  return {
    platform: "youtube",
    accessToken,
    refreshToken: refreshToken || null,
    tokenExpiresAt: expiresIn
      ? Timestamp.fromDate(new Date(Date.now() + expiresIn * 1000))
      : null,
    platformUserId: channel?.id || "",
    username: channel?.snippet?.title || "",
    profileImage: channel?.snippet?.thumbnails?.default?.url || null,
  };
}

export async function refreshYouTubeToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await axios.post(
    YOUTUBE_TOKEN_URL,
    new URLSearchParams({
      client_id: YOUTUBE_CLIENT_ID,
      client_secret: YOUTUBE_CLIENT_SECRET,
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
    expiresIn: response.data.expires_in,
  };
}

export async function publishToYouTube(
  accessToken: string,
  videoUrl: string,
  title: string,
  description: string,
  tags: string[],
  privacyStatus: "public" | "unlisted" | "private" = "public"
): Promise<{ videoId: string }> {
  // Download the video from the URL
  const videoResponse = await axios.get(videoUrl, {
    responseType: "arraybuffer",
  });

  // Initiate resumable upload
  const initResponse = await axios.post(
    `${YOUTUBE_UPLOAD_URL}?uploadType=resumable&part=snippet,status`,
    {
      snippet: {
        title: title.substring(0, 100),
        description,
        tags,
      },
      status: {
        privacyStatus,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/*",
        "X-Upload-Content-Length": videoResponse.data.byteLength,
      },
    }
  );

  const uploadUrl = initResponse.headers.location;

  // Upload the video data
  const uploadResponse = await axios.put(uploadUrl, videoResponse.data, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "video/*",
      "Content-Length": videoResponse.data.byteLength,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return {
    videoId: uploadResponse.data.id,
  };
}

export async function getYouTubeVideoMetrics(
  accessToken: string,
  videoId: string
): Promise<{
  views: number;
  likes: number;
  comments: number;
  shares: number;
}> {
  const response = await axios.get(`${YOUTUBE_API_URL}/videos`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      part: "statistics",
      id: videoId,
    },
  });

  const stats = response.data.items?.[0]?.statistics;
  if (!stats) {
    return { views: 0, likes: 0, comments: 0, shares: 0 };
  }

  return {
    views: parseInt(stats.viewCount || "0", 10),
    likes: parseInt(stats.likeCount || "0", 10),
    comments: parseInt(stats.commentCount || "0", 10),
    shares: 0, // YouTube API doesn't expose share count directly
  };
}
