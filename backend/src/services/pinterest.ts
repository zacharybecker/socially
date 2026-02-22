import axios from "axios";
import { Timestamp } from "firebase-admin/firestore";
import { SocialAccount } from "../types/index.js";

const PINTEREST_APP_ID = process.env.PINTEREST_APP_ID || "";
const PINTEREST_APP_SECRET = process.env.PINTEREST_APP_SECRET || "";
const PINTEREST_REDIRECT_URI = process.env.PINTEREST_REDIRECT_URI || "";

const PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth/";
const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";
const PINTEREST_API_URL = "https://api.pinterest.com/v5";

export function getPinterestAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: PINTEREST_APP_ID,
    redirect_uri: PINTEREST_REDIRECT_URI,
    response_type: "code",
    scope: "boards:read,pins:read,pins:write,user_accounts:read",
    state,
  });

  return `${PINTEREST_AUTH_URL}?${params.toString()}`;
}

export async function exchangePinterestCode(
  code: string
): Promise<Partial<SocialAccount>> {
  // Exchange code for tokens
  const tokenResponse = await axios.post(
    PINTEREST_TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: PINTEREST_REDIRECT_URI,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`).toString("base64")}`,
      },
    }
  );

  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
  } = tokenResponse.data;

  // Get user info
  const userResponse = await axios.get(`${PINTEREST_API_URL}/user_account`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const userData = userResponse.data;

  return {
    platform: "pinterest",
    accessToken,
    refreshToken: refreshToken || null,
    tokenExpiresAt: expiresIn
      ? Timestamp.fromDate(new Date(Date.now() + expiresIn * 1000))
      : null,
    platformUserId: userData.id || "",
    username: userData.username || "",
    profileImage: userData.profile_image || null,
  };
}

export async function refreshPinterestToken(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const response = await axios.post(
    PINTEREST_TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${PINTEREST_APP_ID}:${PINTEREST_APP_SECRET}`).toString("base64")}`,
      },
    }
  );

  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresIn: response.data.expires_in,
  };
}

export async function publishToPinterest(
  accessToken: string,
  boardId: string,
  title: string,
  description: string,
  mediaUrl: string,
  link?: string
): Promise<{ pinId: string }> {
  const pinData: Record<string, unknown> = {
    board_id: boardId,
    title: title.substring(0, 100),
    description: description.substring(0, 500),
    media_source: {
      source_type: "image_url",
      url: mediaUrl,
    },
  };

  if (link) {
    pinData.link = link;
  }

  const response = await axios.post(`${PINTEREST_API_URL}/pins`, pinData, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  return {
    pinId: response.data.id,
  };
}

export async function getPinterestBoards(
  accessToken: string
): Promise<Array<{ id: string; name: string; description: string; privacy: string }>> {
  const response = await axios.get(`${PINTEREST_API_URL}/boards`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return (response.data.items || []).map((board: Record<string, unknown>) => ({
    id: board.id as string,
    name: board.name as string,
    description: (board.description as string) || "",
    privacy: (board.privacy as string) || "PUBLIC",
  }));
}

export async function getPinterestPinMetrics(
  accessToken: string,
  pinId: string
): Promise<{
  impressions: number;
  saves: number;
  clicks: number;
  comments: number;
}> {
  const response = await axios.get(
    `${PINTEREST_API_URL}/pins/${pinId}/analytics`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        metric_types: "IMPRESSION,SAVE,PIN_CLICK,COMMENT",
      },
    }
  );

  const data = response.data?.all?.lifetime_metrics || response.data;

  return {
    impressions: data.IMPRESSION || 0,
    saves: data.SAVE || 0,
    clicks: data.PIN_CLICK || 0,
    comments: data.COMMENT || 0,
  };
}
