import axios from "axios";
import { Timestamp } from "firebase-admin/firestore";
import { SocialAccount } from "../types/index.js";

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID || "";
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET || "";
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI || "";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API_URL = "https://api.linkedin.com/v2";
const LINKEDIN_REST_URL = "https://api.linkedin.com/rest";

export function getLinkedInAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINKEDIN_CLIENT_ID,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    scope: "w_member_social r_liteprofile",
    state,
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

export async function exchangeLinkedInCode(
  code: string
): Promise<Partial<SocialAccount>> {
  // Exchange code for tokens
  const tokenResponse = await axios.post(
    LINKEDIN_TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
      redirect_uri: LINKEDIN_REDIRECT_URI,
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

  // Get profile info
  const profileResponse = await axios.get(`${LINKEDIN_API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      projection: "(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))",
    },
  });

  const profile = profileResponse.data;
  const displayName = `${profile.localizedFirstName} ${profile.localizedLastName}`;
  const profileImage =
    profile.profilePicture?.["displayImage~"]?.elements?.[0]?.identifiers?.[0]?.identifier || null;

  return {
    platform: "linkedin",
    accessToken,
    refreshToken: refreshToken || null,
    tokenExpiresAt: expiresIn
      ? Timestamp.fromDate(new Date(Date.now() + expiresIn * 1000))
      : null,
    platformUserId: profile.id,
    username: displayName,
    profileImage,
  };
}

export async function refreshLinkedInToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const response = await axios.post(
    LINKEDIN_TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
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

export async function publishToLinkedIn(
  accessToken: string,
  authorUrn: string,
  content: string,
  mediaUrl?: string,
  mediaType?: "image" | "video"
): Promise<{ postUrn: string }> {
  if (!mediaUrl) {
    // Text-only post
    const response = await axios.post(
      `${LINKEDIN_REST_URL}/posts`,
      {
        author: `urn:li:person:${authorUrn}`,
        lifecycleState: "PUBLISHED",
        visibility: "PUBLIC",
        commentary: content,
        distribution: {
          feedDistribution: "MAIN_FEED",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202401",
          "X-Restli-Protocol-Version": "2.0.0",
        },
      }
    );

    const postUrn = response.headers["x-restli-id"] || response.data.id || "";
    return { postUrn };
  }

  // Register media upload
  const registerResponse = await axios.post(
    `${LINKEDIN_REST_URL}/images?action=initializeUpload`,
    {
      initializeUploadRequest: {
        owner: `urn:li:person:${authorUrn}`,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
      },
    }
  );

  const { uploadUrl, image: imageUrn } =
    registerResponse.data.value;

  // Download and upload media
  const mediaResponse = await axios.get(mediaUrl, {
    responseType: "arraybuffer",
  });

  await axios.put(uploadUrl, mediaResponse.data, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": mediaType === "video" ? "video/mp4" : "image/jpeg",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  // Create post with media
  const postResponse = await axios.post(
    `${LINKEDIN_REST_URL}/posts`,
    {
      author: `urn:li:person:${authorUrn}`,
      lifecycleState: "PUBLISHED",
      visibility: "PUBLIC",
      commentary: content,
      distribution: {
        feedDistribution: "MAIN_FEED",
      },
      content: {
        media: {
          id: imageUrn,
        },
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  const postUrn = postResponse.headers["x-restli-id"] || postResponse.data.id || "";
  return { postUrn };
}

export async function getLinkedInPostMetrics(
  accessToken: string,
  postUrn: string
): Promise<{
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
}> {
  const response = await axios.get(
    `${LINKEDIN_REST_URL}/socialMetadata/${encodeURIComponent(postUrn)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "LinkedIn-Version": "202401",
      },
    }
  );

  const data = response.data;

  return {
    impressions: data.impressionCount || 0,
    likes: data.likeCount || 0,
    comments: data.commentCount || 0,
    shares: data.shareCount || 0,
    clicks: data.clickCount || 0,
  };
}
