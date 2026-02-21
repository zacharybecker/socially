import axios from "axios";
import crypto from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { SocialAccount } from "../types/index.js";

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || "";
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || "";
const TWITTER_REDIRECT_URI = process.env.TWITTER_REDIRECT_URI || "";

const TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize";
const TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const TWITTER_API_URL = "https://api.twitter.com/2";
const TWITTER_UPLOAD_URL = "https://upload.twitter.com/1.1/media/upload.json";

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export function getTwitterAuthUrl(state: string): { authUrl: string; codeVerifier: string } {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: TWITTER_REDIRECT_URI,
    scope: "tweet.read tweet.write users.read offline.access",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return {
    authUrl: `${TWITTER_AUTH_URL}?${params.toString()}`,
    codeVerifier,
  };
}

export async function exchangeTwitterCode(
  code: string,
  codeVerifier: string
): Promise<Partial<SocialAccount>> {
  // Exchange code for tokens
  const tokenResponse = await axios.post(
    TWITTER_TOKEN_URL,
    new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: TWITTER_CLIENT_ID,
      redirect_uri: TWITTER_REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString("base64")}`,
      },
    }
  );

  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  } = tokenResponse.data;

  // Get user info
  const userResponse = await axios.get(`${TWITTER_API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      "user.fields": "id,name,username,profile_image_url",
    },
  });

  const userData = userResponse.data.data;

  return {
    platform: "twitter",
    accessToken,
    refreshToken: refreshToken || null,
    tokenExpiresAt: expiresIn
      ? Timestamp.fromDate(new Date(Date.now() + expiresIn * 1000))
      : null,
    platformUserId: userData.id,
    username: userData.username,
    profileImage: userData.profile_image_url || null,
  };
}

export async function refreshTwitterToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const response = await axios.post(
    TWITTER_TOKEN_URL,
    new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      client_id: TWITTER_CLIENT_ID,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`).toString("base64")}`,
      },
    }
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in,
  };
}

export async function publishToTwitter(
  accessToken: string,
  text: string,
  mediaIds?: string[]
): Promise<{ tweetId: string }> {
  const body: Record<string, unknown> = { text };

  if (mediaIds && mediaIds.length > 0) {
    body.media = { media_ids: mediaIds };
  }

  const response = await axios.post(`${TWITTER_API_URL}/tweets`, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  return {
    tweetId: response.data.data.id,
  };
}

export async function uploadTwitterMedia(
  accessToken: string,
  mediaUrl: string
): Promise<{ mediaId: string }> {
  // Download media from URL
  const mediaResponse = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
  });

  const mediaBuffer = Buffer.from(mediaResponse.data);
  const mediaBase64 = mediaBuffer.toString("base64");

  // Upload via INIT, APPEND, FINALIZE for large media
  // For simplicity, use single upload for images under 5MB
  if (mediaBuffer.byteLength < 5 * 1024 * 1024) {
    const response = await axios.post(
      TWITTER_UPLOAD_URL,
      new URLSearchParams({
        media_data: mediaBase64,
      }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return {
      mediaId: response.data.media_id_string,
    };
  }

  // Chunked upload for larger files
  const totalBytes = mediaBuffer.byteLength;
  const isVideo = mediaUrl.includes(".mp4") || mediaUrl.includes(".mov") || mediaUrl.includes(".webm");
  const mediaType = isVideo ? "video/mp4" : "image/jpeg";

  // INIT
  const initResponse = await axios.post(
    TWITTER_UPLOAD_URL,
    new URLSearchParams({
      command: "INIT",
      total_bytes: totalBytes.toString(),
      media_type: mediaType,
    }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const mediaId = initResponse.data.media_id_string;

  // APPEND in chunks
  const chunkSize = 4 * 1024 * 1024; // 4MB chunks
  let segmentIndex = 0;

  for (let offset = 0; offset < totalBytes; offset += chunkSize) {
    const chunk = mediaBuffer.subarray(offset, Math.min(offset + chunkSize, totalBytes));

    const formData = new URLSearchParams({
      command: "APPEND",
      media_id: mediaId,
      segment_index: segmentIndex.toString(),
      media_data: chunk.toString("base64"),
    });

    await axios.post(TWITTER_UPLOAD_URL, formData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    segmentIndex++;
  }

  // FINALIZE
  await axios.post(
    TWITTER_UPLOAD_URL,
    new URLSearchParams({
      command: "FINALIZE",
      media_id: mediaId,
    }),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return { mediaId };
}

export async function getTwitterTweetMetrics(
  accessToken: string,
  tweetId: string
): Promise<{
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
}> {
  const response = await axios.get(`${TWITTER_API_URL}/tweets/${tweetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      "tweet.fields": "public_metrics",
    },
  });

  const metrics = response.data.data?.public_metrics;
  if (!metrics) {
    return { impressions: 0, likes: 0, retweets: 0, replies: 0 };
  }

  return {
    impressions: metrics.impression_count || 0,
    likes: metrics.like_count || 0,
    retweets: metrics.retweet_count || 0,
    replies: metrics.reply_count || 0,
  };
}
