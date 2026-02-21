import axios from "axios";
import { Timestamp } from "firebase-admin/firestore";
import { SocialAccount } from "../types/index.js";

const INSTAGRAM_APP_ID = process.env.INSTAGRAM_APP_ID || "";
const INSTAGRAM_APP_SECRET = process.env.INSTAGRAM_APP_SECRET || "";
const INSTAGRAM_REDIRECT_URI = process.env.INSTAGRAM_REDIRECT_URI || "";

const INSTAGRAM_AUTH_URL = "https://api.instagram.com/oauth/authorize";
const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";
const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v18.0";

export function getInstagramAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: INSTAGRAM_APP_ID,
    redirect_uri: INSTAGRAM_REDIRECT_URI,
    scope: "instagram_basic,instagram_content_publish,instagram_manage_insights",
    response_type: "code",
    state,
  });

  return `${INSTAGRAM_AUTH_URL}?${params.toString()}`;
}

export async function exchangeInstagramCode(
  code: string
): Promise<Partial<SocialAccount>> {
  // Exchange code for short-lived access token
  const tokenResponse = await axios.post(
    INSTAGRAM_TOKEN_URL,
    new URLSearchParams({
      client_id: INSTAGRAM_APP_ID,
      client_secret: INSTAGRAM_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: INSTAGRAM_REDIRECT_URI,
      code,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const { access_token: shortLivedToken, user_id: userId } = tokenResponse.data;

  // Exchange for long-lived token
  const longLivedResponse = await axios.get(
    `${INSTAGRAM_GRAPH_URL}/access_token`,
    {
      params: {
        grant_type: "ig_exchange_token",
        client_secret: INSTAGRAM_APP_SECRET,
        access_token: shortLivedToken,
      },
    }
  );

  const { access_token: accessToken, expires_in: expiresIn } =
    longLivedResponse.data;

  // Get user profile
  const userResponse = await axios.get(`${INSTAGRAM_GRAPH_URL}/me`, {
    params: {
      fields: "id,username,account_type,media_count",
      access_token: accessToken,
    },
  });

  const userData = userResponse.data;

  return {
    platform: "instagram",
    accessToken,
    refreshToken: null, // Instagram uses long-lived tokens that can be refreshed
    tokenExpiresAt: expiresIn
      ? Timestamp.fromDate(new Date(Date.now() + expiresIn * 1000))
      : null,
    platformUserId: userId.toString(),
    username: userData.username,
    profileImage: null, // Instagram API doesn't return profile picture in basic scope
  };
}

export async function refreshInstagramToken(
  accessToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await axios.get(`${INSTAGRAM_GRAPH_URL}/refresh_access_token`, {
    params: {
      grant_type: "ig_refresh_token",
      access_token: accessToken,
    },
  });

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
  };
}

export async function publishToInstagram(
  accessToken: string,
  igUserId: string,
  mediaUrl: string,
  caption: string,
  mediaType: "IMAGE" | "VIDEO" | "REELS"
): Promise<{ mediaId: string }> {
  // Step 1: Create media container
  const containerParams: Record<string, string> = {
    caption,
    access_token: accessToken,
  };

  if (mediaType === "IMAGE") {
    containerParams.image_url = mediaUrl;
  } else if (mediaType === "VIDEO" || mediaType === "REELS") {
    containerParams.media_type = mediaType;
    containerParams.video_url = mediaUrl;
  }

  const containerResponse = await axios.post(
    `${FACEBOOK_GRAPH_URL}/${igUserId}/media`,
    null,
    { params: containerParams }
  );

  const containerId = containerResponse.data.id;

  // Step 2: Wait for media to be ready (for videos)
  if (mediaType === "VIDEO" || mediaType === "REELS") {
    let status = "IN_PROGRESS";
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max wait

    while (status === "IN_PROGRESS" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await axios.get(
        `${FACEBOOK_GRAPH_URL}/${containerId}`,
        {
          params: {
            fields: "status_code",
            access_token: accessToken,
          },
        }
      );
      
      status = statusResponse.data.status_code;
      attempts++;
    }

    if (status !== "FINISHED") {
      throw new Error(`Media processing failed with status: ${status}`);
    }
  }

  // Step 3: Publish the media
  const publishResponse = await axios.post(
    `${FACEBOOK_GRAPH_URL}/${igUserId}/media_publish`,
    null,
    {
      params: {
        creation_id: containerId,
        access_token: accessToken,
      },
    }
  );

  return {
    mediaId: publishResponse.data.id,
  };
}

export async function getInstagramInsights(
  accessToken: string,
  mediaId: string
): Promise<{
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  videoViews: number;
  engagements: number;
}> {
  const response = await axios.get(`${FACEBOOK_GRAPH_URL}/${mediaId}/insights`, {
    params: {
      metric: "impressions,reach,likes,comments,shares,saved,video_views,total_interactions",
      access_token: accessToken,
    },
  });

  const metricsMap: Record<string, number> = {};
  for (const entry of response.data?.data || []) {
    metricsMap[entry.name] = entry.values?.[0]?.value || 0;
  }

  return {
    impressions: metricsMap.impressions || 0,
    reach: metricsMap.reach || 0,
    likes: metricsMap.likes || 0,
    comments: metricsMap.comments || 0,
    shares: metricsMap.shares || 0,
    saves: metricsMap.saved || 0,
    videoViews: metricsMap.video_views || 0,
    engagements: metricsMap.total_interactions || 0,
  };
}

export async function getInstagramAccountInsights(
  accessToken: string,
  igUserId: string,
  period: "day" | "week" | "days_28" = "day"
): Promise<{
  impressions: number;
  reach: number;
  followerCount: number;
  profileViews: number;
}> {
  // Get account-level insights
  const insightsResponse = await axios.get(
    `${FACEBOOK_GRAPH_URL}/${igUserId}/insights`,
    {
      params: {
        metric: "impressions,reach,profile_views",
        period,
        access_token: accessToken,
      },
    }
  );

  const metricsMap: Record<string, number> = {};
  for (const entry of insightsResponse.data?.data || []) {
    metricsMap[entry.name] = entry.values?.[0]?.value || 0;
  }

  // Get follower count from user endpoint
  const userResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/${igUserId}`, {
    params: {
      fields: "followers_count",
      access_token: accessToken,
    },
  });

  return {
    impressions: metricsMap.impressions || 0,
    reach: metricsMap.reach || 0,
    followerCount: userResponse.data?.followers_count || 0,
    profileViews: metricsMap.profile_views || 0,
  };
}
