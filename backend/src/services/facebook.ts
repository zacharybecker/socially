import axios from "axios";
import { Timestamp } from "firebase-admin/firestore";
import { SocialAccount } from "../types/index.js";

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || "";
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || "";
const FACEBOOK_REDIRECT_URI = process.env.FACEBOOK_REDIRECT_URI || "";

const FACEBOOK_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";
const FACEBOOK_GRAPH_URL = "https://graph.facebook.com/v18.0";

export function getFacebookAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: FACEBOOK_APP_ID,
    redirect_uri: FACEBOOK_REDIRECT_URI,
    scope: "pages_manage_posts,pages_read_engagement,pages_show_list",
    response_type: "code",
    state,
  });

  return `${FACEBOOK_AUTH_URL}?${params.toString()}`;
}

export async function exchangeFacebookCode(
  code: string
): Promise<Partial<SocialAccount>> {
  // Exchange code for short-lived user token
  const tokenResponse = await axios.get(FACEBOOK_TOKEN_URL, {
    params: {
      client_id: FACEBOOK_APP_ID,
      client_secret: FACEBOOK_APP_SECRET,
      redirect_uri: FACEBOOK_REDIRECT_URI,
      code,
    },
  });

  const { access_token: shortLivedToken } = tokenResponse.data;

  // Exchange for long-lived user token
  const longLivedResponse = await axios.get(FACEBOOK_TOKEN_URL, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: FACEBOOK_APP_ID,
      client_secret: FACEBOOK_APP_SECRET,
      fb_exchange_token: shortLivedToken,
    },
  });

  const { access_token: longLivedToken, expires_in: expiresIn } =
    longLivedResponse.data;

  // Get user info and pages
  const userResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me`, {
    params: {
      fields: "id,name,picture",
      access_token: longLivedToken,
    },
  });

  const userData = userResponse.data;

  // Get user's pages to find page access token
  const pagesResponse = await axios.get(`${FACEBOOK_GRAPH_URL}/me/accounts`, {
    params: {
      access_token: longLivedToken,
    },
  });

  const firstPage = pagesResponse.data.data?.[0];

  // Use the page access token if available, otherwise use user token
  const accessToken = firstPage?.access_token || longLivedToken;
  const platformUserId = firstPage?.id || userData.id;
  const username = firstPage?.name || userData.name;

  return {
    platform: "facebook",
    accessToken,
    refreshToken: null, // Facebook uses long-lived tokens
    tokenExpiresAt: expiresIn
      ? Timestamp.fromDate(new Date(Date.now() + expiresIn * 1000))
      : null,
    platformUserId,
    username,
    profileImage: userData.picture?.data?.url || null,
  };
}

export async function refreshFacebookToken(
  accessToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  // Exchange current token for a new long-lived token
  const response = await axios.get(FACEBOOK_TOKEN_URL, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: FACEBOOK_APP_ID,
      client_secret: FACEBOOK_APP_SECRET,
      fb_exchange_token: accessToken,
    },
  });

  return {
    accessToken: response.data.access_token,
    expiresIn: response.data.expires_in,
  };
}

export async function publishToFacebook(
  pageAccessToken: string,
  pageId: string,
  content: string,
  mediaUrl?: string,
  mediaType?: "image" | "video"
): Promise<{ postId: string }> {
  if (!mediaUrl) {
    // Text-only post
    const response = await axios.post(
      `${FACEBOOK_GRAPH_URL}/${pageId}/feed`,
      null,
      {
        params: {
          message: content,
          access_token: pageAccessToken,
        },
      }
    );

    return { postId: response.data.id };
  }

  if (mediaType === "video") {
    // Video post
    const response = await axios.post(
      `${FACEBOOK_GRAPH_URL}/${pageId}/videos`,
      null,
      {
        params: {
          file_url: mediaUrl,
          description: content,
          access_token: pageAccessToken,
        },
      }
    );

    return { postId: response.data.id };
  }

  // Photo post
  const response = await axios.post(
    `${FACEBOOK_GRAPH_URL}/${pageId}/photos`,
    null,
    {
      params: {
        url: mediaUrl,
        message: content,
        access_token: pageAccessToken,
      },
    }
  );

  return { postId: response.data.post_id || response.data.id };
}

export async function getFacebookPostInsights(
  pageAccessToken: string,
  postId: string
): Promise<{
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  engagements: number;
}> {
  const response = await axios.get(
    `${FACEBOOK_GRAPH_URL}/${postId}/insights`,
    {
      params: {
        metric: "post_impressions,post_impressions_unique,post_reactions_like_total,post_comments,post_shares,post_engaged_users",
        access_token: pageAccessToken,
      },
    }
  );

  const metricsMap: Record<string, number> = {};
  for (const entry of response.data?.data || []) {
    metricsMap[entry.name] = entry.values?.[0]?.value || 0;
  }

  return {
    impressions: metricsMap.post_impressions || 0,
    reach: metricsMap.post_impressions_unique || 0,
    likes: metricsMap.post_reactions_like_total || 0,
    comments: metricsMap.post_comments || 0,
    shares: metricsMap.post_shares || 0,
    engagements: metricsMap.post_engaged_users || 0,
  };
}
