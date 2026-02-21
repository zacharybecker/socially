import axios from "axios";
import { Timestamp } from "firebase-admin/firestore";
import { SocialAccount } from "../types/index.js";

const THREADS_APP_ID = process.env.THREADS_APP_ID || "";
const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET || "";
const THREADS_REDIRECT_URI = process.env.THREADS_REDIRECT_URI || "";

const THREADS_AUTH_URL = "https://threads.net/oauth/authorize";
const THREADS_TOKEN_URL = "https://graph.threads.net/oauth/access_token";
const THREADS_GRAPH_URL = "https://graph.threads.net/v1.0";

export function getThreadsAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: THREADS_APP_ID,
    redirect_uri: THREADS_REDIRECT_URI,
    scope: "threads_basic,threads_content_publish,threads_read_replies,threads_manage_insights",
    response_type: "code",
    state,
  });

  return `${THREADS_AUTH_URL}?${params.toString()}`;
}

export async function exchangeThreadsCode(
  code: string
): Promise<Partial<SocialAccount>> {
  // Exchange code for short-lived token
  const tokenResponse = await axios.post(
    THREADS_TOKEN_URL,
    new URLSearchParams({
      client_id: THREADS_APP_ID,
      client_secret: THREADS_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: THREADS_REDIRECT_URI,
      code,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const { access_token: shortLivedToken, user_id: userId } =
    tokenResponse.data;

  // Exchange for long-lived token
  const longLivedResponse = await axios.get(
    `${THREADS_GRAPH_URL}/access_token`,
    {
      params: {
        grant_type: "th_exchange_token",
        client_secret: THREADS_APP_SECRET,
        access_token: shortLivedToken,
      },
    }
  );

  const { access_token: accessToken, expires_in: expiresIn } =
    longLivedResponse.data;

  // Get user profile
  const userResponse = await axios.get(`${THREADS_GRAPH_URL}/me`, {
    params: {
      fields: "id,username,threads_profile_picture_url",
      access_token: accessToken,
    },
  });

  const userData = userResponse.data;

  return {
    platform: "threads",
    accessToken,
    refreshToken: null, // Threads uses long-lived tokens
    tokenExpiresAt: expiresIn
      ? Timestamp.fromDate(new Date(Date.now() + expiresIn * 1000))
      : null,
    platformUserId: userId.toString(),
    username: userData.username || userId.toString(),
    profileImage: userData.threads_profile_picture_url || null,
  };
}

export async function refreshThreadsToken(
  accessToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await axios.get(
    `${THREADS_GRAPH_URL}/refresh_access_token`,
    {
      params: {
        grant_type: "th_refresh_token",
        access_token: accessToken,
      },
    }
  );

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
  };
}

export async function publishToThreads(
  accessToken: string,
  userId: string,
  text: string,
  mediaUrl?: string,
  mediaType?: "IMAGE" | "VIDEO"
): Promise<{ threadId: string }> {
  // Enforce 500 character limit
  const truncatedText = text.substring(0, 500);

  // Step 1: Create media container
  const containerParams: Record<string, string> = {
    text: truncatedText,
    media_type: mediaUrl ? (mediaType || "IMAGE") : "TEXT",
    access_token: accessToken,
  };

  if (mediaUrl && mediaType === "IMAGE") {
    containerParams.image_url = mediaUrl;
  } else if (mediaUrl && mediaType === "VIDEO") {
    containerParams.video_url = mediaUrl;
  }

  const containerResponse = await axios.post(
    `${THREADS_GRAPH_URL}/${userId}/threads`,
    null,
    { params: containerParams }
  );

  const containerId = containerResponse.data.id;

  // Step 2: Wait for media processing (for videos)
  if (mediaUrl && mediaType === "VIDEO") {
    let status = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 30;

    while (status === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const statusResponse = await axios.get(
        `${THREADS_GRAPH_URL}/${containerId}`,
        {
          params: {
            fields: "status",
            access_token: accessToken,
          },
        }
      );

      status = statusResponse.data.status;
      attempts++;
    }

    if (status !== "FINISHED") {
      throw new Error(`Threads media processing failed with status: ${status}`);
    }
  }

  // Step 3: Publish the thread
  const publishResponse = await axios.post(
    `${THREADS_GRAPH_URL}/${userId}/threads_publish`,
    null,
    {
      params: {
        creation_id: containerId,
        access_token: accessToken,
      },
    }
  );

  return {
    threadId: publishResponse.data.id,
  };
}

export async function getThreadsPostMetrics(
  accessToken: string,
  threadId: string
): Promise<{
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
}> {
  const response = await axios.get(
    `${THREADS_GRAPH_URL}/${threadId}/insights`,
    {
      params: {
        metric: "views,likes,replies,reposts,quotes",
        access_token: accessToken,
      },
    }
  );

  const metricsMap: Record<string, number> = {};
  for (const entry of response.data?.data || []) {
    metricsMap[entry.name] = entry.values?.[0]?.value || 0;
  }

  return {
    views: metricsMap.views || 0,
    likes: metricsMap.likes || 0,
    replies: metricsMap.replies || 0,
    reposts: metricsMap.reposts || 0,
    quotes: metricsMap.quotes || 0,
  };
}
