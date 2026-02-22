import { FastifyInstance } from "fastify";
import { z } from "zod";
import { createHmac, timingSafeEqual } from "crypto";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { db } from "../services/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { SocialAccount, SocialAccountResponse, Platform, PlanTier } from "../types/index.js";
import { createError } from "../middleware/errorHandler.js";
import { getPlanLimits } from "../config/plans.js";

const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.TIKTOK_CLIENT_SECRET || "";

function signOAuthState(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", OAUTH_STATE_SECRET).update(data).digest("hex");
  return `${data}.${sig}`;
}

function verifyOAuthState(state: string): unknown {
  const dotIdx = state.lastIndexOf(".");
  if (dotIdx === -1) return null;
  const data = state.substring(0, dotIdx);
  const sig = state.substring(dotIdx + 1);
  const expected = createHmac("sha256", OAUTH_STATE_SECRET).update(data).digest("hex");
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

const callbackStateSchema = z.object({
  orgId: z.string().min(1),
  userId: z.string().min(1),
  codeVerifier: z.string().optional(),
});
import { getTikTokAuthUrl, exchangeTikTokCode, refreshTikTokToken } from "../services/tiktok.js";
import { getInstagramAuthUrl, exchangeInstagramCode, refreshInstagramToken } from "../services/instagram.js";
import { getYouTubeAuthUrl, exchangeYouTubeCode, refreshYouTubeToken } from "../services/youtube.js";
import { getTwitterAuthUrl, exchangeTwitterCode, refreshTwitterToken } from "../services/twitter.js";
import { getFacebookAuthUrl, exchangeFacebookCode, refreshFacebookToken } from "../services/facebook.js";
import { getLinkedInAuthUrl, exchangeLinkedInCode, refreshLinkedInToken } from "../services/linkedin.js";
import { getThreadsAuthUrl, exchangeThreadsCode, refreshThreadsToken } from "../services/threads.js";
import { getPinterestAuthUrl, exchangePinterestCode, refreshPinterestToken, getPinterestBoards } from "../services/pinterest.js";

export async function accountRoutes(fastify: FastifyInstance) {
  // List connected accounts
  fastify.get<{
    Params: { orgId: string };
  }>(
    "/",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId } = request.params;

      const accountsSnapshot = await db.socialAccounts(orgId).get();

      const accounts: SocialAccountResponse[] = accountsSnapshot.docs.map((doc) => {
        const data = doc.data() as SocialAccount;
        return {
          id: doc.id,
          platform: data.platform,
          platformUserId: data.platformUserId,
          username: data.username,
          profileImage: data.profileImage,
          connectedAt: data.connectedAt.toDate(),
          lastSyncAt: data.lastSyncAt?.toDate() || null,
        };
      });

      return reply.send({
        success: true,
        data: accounts,
      });
    }
  );

  // Get OAuth URL for connecting an account
  fastify.get<{
    Params: { orgId: string; platform: Platform };
  }>(
    "/connect/:platform",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, platform } = request.params;

      let authUrl: string;
      const baseState = { orgId, userId: request.user!.uid };

      switch (platform) {
        case "tiktok":
          authUrl = getTikTokAuthUrl(signOAuthState(baseState));
          break;
        case "instagram":
          authUrl = getInstagramAuthUrl(signOAuthState(baseState));
          break;
        case "youtube":
          authUrl = getYouTubeAuthUrl(signOAuthState(baseState));
          break;
        case "twitter": {
          // Twitter uses PKCE — embed codeVerifier in state for retrieval in callback
          const { authUrl: twitterUrl, codeVerifier } = getTwitterAuthUrl(
            signOAuthState({ ...baseState, codeVerifier: "" }) // placeholder
          );
          // Re-sign state with codeVerifier included
          authUrl = twitterUrl.replace(
            /state=[^&]+/,
            `state=${signOAuthState({ ...baseState, codeVerifier })}`
          );
          break;
        }
        case "facebook":
          authUrl = getFacebookAuthUrl(signOAuthState(baseState));
          break;
        case "linkedin":
          authUrl = getLinkedInAuthUrl(signOAuthState(baseState));
          break;
        case "threads":
          authUrl = getThreadsAuthUrl(signOAuthState(baseState));
          break;
        case "pinterest":
          authUrl = getPinterestAuthUrl(signOAuthState(baseState));
          break;
        default:
          throw createError(`Platform ${platform} is not supported yet`, 400);
      }

      return reply.send({
        success: true,
        data: { authUrl },
      });
    }
  );

  // OAuth callback handler
  fastify.get<{
    Params: { orgId: string; platform: Platform };
    Querystring: { code: string; state: string };
  }>(
    "/callback/:platform",
    async (request, reply) => {
      const { platform } = request.params;
      const { code, state } = request.query;

      try {
        const decoded = verifyOAuthState(state);
        if (!decoded) {
          throw createError("Invalid OAuth state signature", 400);
        }
        const { orgId, userId, codeVerifier } = callbackStateSchema.parse(decoded);

        let accountData: Partial<SocialAccount>;

        switch (platform) {
          case "tiktok":
            accountData = await exchangeTikTokCode(code);
            break;
          case "instagram":
            accountData = await exchangeInstagramCode(code);
            break;
          case "youtube":
            accountData = await exchangeYouTubeCode(code);
            break;
          case "twitter":
            if (!codeVerifier) {
              throw createError("Missing PKCE code verifier for Twitter", 400);
            }
            accountData = await exchangeTwitterCode(code, codeVerifier);
            break;
          case "facebook":
            accountData = await exchangeFacebookCode(code);
            break;
          case "linkedin":
            accountData = await exchangeLinkedInCode(code);
            break;
          case "threads":
            accountData = await exchangeThreadsCode(code);
            break;
          case "pinterest":
            accountData = await exchangePinterestCode(code);
            break;
          default:
            throw createError(`Platform ${platform} is not supported`, 400);
        }

        // Check if account already connected
        const existingAccount = await db.socialAccounts(orgId)
          .where("platformUserId", "==", accountData.platformUserId)
          .where("platform", "==", platform)
          .get();

        if (!existingAccount.empty) {
          // Update existing account
          const docId = existingAccount.docs[0].id;
          await db.socialAccount(orgId, docId).update({
            ...accountData,
            connectedAt: Timestamp.now(),
          });

          request.log.info({ audit: true, event: "account_connected", orgId, platform, accountId: docId }, "Social account reconnected");

          // Redirect to frontend with success
          return reply.redirect(
            `${process.env.FRONTEND_URL}/dashboard/accounts?connected=${platform}`
          );
        }

        // Check social accounts limit before creating new account
        const userDoc = await db.user(userId).get();
        const planTier = (userDoc.data()?.planTier as PlanTier) || "free";
        const limits = getPlanLimits(planTier);

        if (limits.socialAccounts !== -1) {
          const allAccountsSnapshot = await db.socialAccounts(orgId).get();
          if (allAccountsSnapshot.size >= limits.socialAccounts) {
            return reply.redirect(
              `${process.env.FRONTEND_URL}/dashboard/accounts?error=account_limit_reached`
            );
          }
        }

        // Create new account
        const fullAccountData: Omit<SocialAccount, "id"> = {
          platform,
          accessToken: accountData.accessToken!,
          refreshToken: accountData.refreshToken || null,
          tokenExpiresAt: accountData.tokenExpiresAt || null,
          platformUserId: accountData.platformUserId!,
          username: accountData.username!,
          profileImage: accountData.profileImage || null,
          connectedAt: Timestamp.now(),
          lastSyncAt: null,
        };

        const newAccountRef = await db.socialAccounts(orgId).add(fullAccountData);

        request.log.info({ audit: true, event: "account_connected", orgId, platform, accountId: newAccountRef.id }, "Social account connected");

        // Redirect to frontend with success
        return reply.redirect(
          `${process.env.FRONTEND_URL}/dashboard/accounts?connected=${platform}`
        );
      } catch (error) {
        request.log.error(error, "OAuth callback error");
        return reply.redirect(
          `${process.env.FRONTEND_URL}/dashboard/accounts?error=connection_failed`
        );
      }
    }
  );

  // Disconnect account
  fastify.delete<{
    Params: { orgId: string; accountId: string };
  }>(
    "/:accountId",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, accountId } = request.params;

      const accountDoc = await db.socialAccount(orgId, accountId).get();

      if (!accountDoc.exists) {
        throw createError("Account not found", 404);
      }

      await db.socialAccount(orgId, accountId).delete();

      request.log.info({ audit: true, event: "account_disconnected", orgId, accountId }, "Social account disconnected");

      return reply.send({
        success: true,
        message: "Account disconnected successfully",
      });
    }
  );

  // Refresh account token
  fastify.post<{
    Params: { orgId: string; accountId: string };
  }>(
    "/:accountId/refresh",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, accountId } = request.params;

      const accountDoc = await db.socialAccount(orgId, accountId).get();

      if (!accountDoc.exists) {
        throw createError("Account not found", 404);
      }

      const accountData = accountDoc.data() as SocialAccount;

      const updateData: Record<string, unknown> = {
        lastSyncAt: Timestamp.now(),
      };

      switch (accountData.platform) {
        case "tiktok":
          if (accountData.refreshToken) {
            const tiktokResult = await refreshTikTokToken(accountData.refreshToken);
            updateData.accessToken = tiktokResult.accessToken;
            updateData.refreshToken = tiktokResult.refreshToken;
            updateData.tokenExpiresAt = Timestamp.fromDate(
              new Date(Date.now() + tiktokResult.expiresIn * 1000)
            );
          }
          break;
        case "instagram": {
          const igResult = await refreshInstagramToken(accountData.accessToken);
          updateData.accessToken = igResult.accessToken;
          updateData.tokenExpiresAt = Timestamp.fromDate(
            new Date(Date.now() + igResult.expiresIn * 1000)
          );
          break;
        }
        case "youtube":
          if (accountData.refreshToken) {
            const ytResult = await refreshYouTubeToken(accountData.refreshToken);
            updateData.accessToken = ytResult.accessToken;
            updateData.tokenExpiresAt = Timestamp.fromDate(
              new Date(Date.now() + ytResult.expiresIn * 1000)
            );
          }
          break;
        case "twitter":
          if (accountData.refreshToken) {
            const twResult = await refreshTwitterToken(accountData.refreshToken);
            updateData.accessToken = twResult.accessToken;
            updateData.refreshToken = twResult.refreshToken;
            updateData.tokenExpiresAt = Timestamp.fromDate(
              new Date(Date.now() + twResult.expiresIn * 1000)
            );
          }
          break;
        case "facebook": {
          const fbResult = await refreshFacebookToken(accountData.accessToken);
          updateData.accessToken = fbResult.accessToken;
          updateData.tokenExpiresAt = Timestamp.fromDate(
            new Date(Date.now() + fbResult.expiresIn * 1000)
          );
          break;
        }
        case "linkedin":
          if (accountData.refreshToken) {
            const liResult = await refreshLinkedInToken(accountData.refreshToken);
            updateData.accessToken = liResult.accessToken;
            updateData.refreshToken = liResult.refreshToken;
            updateData.tokenExpiresAt = Timestamp.fromDate(
              new Date(Date.now() + liResult.expiresIn * 1000)
            );
          }
          break;
        case "threads": {
          const thResult = await refreshThreadsToken(accountData.accessToken);
          updateData.accessToken = thResult.accessToken;
          updateData.tokenExpiresAt = Timestamp.fromDate(
            new Date(Date.now() + thResult.expiresIn * 1000)
          );
          break;
        }
        case "pinterest":
          if (accountData.refreshToken) {
            const pinResult = await refreshPinterestToken(accountData.refreshToken);
            updateData.accessToken = pinResult.accessToken;
            updateData.refreshToken = pinResult.refreshToken;
            updateData.tokenExpiresAt = Timestamp.fromDate(
              new Date(Date.now() + pinResult.expiresIn * 1000)
            );
          }
          break;
        default:
          throw createError(
            `Token refresh is not supported for ${accountData.platform}`,
            400
          );
      }

      await db.socialAccount(orgId, accountId).update(updateData);

      return reply.send({
        success: true,
        data: {
          id: accountId,
          platform: accountData.platform,
          platformUserId: accountData.platformUserId,
          username: accountData.username,
          profileImage: accountData.profileImage,
          connectedAt: accountData.connectedAt.toDate(),
          lastSyncAt: new Date(),
        },
      });
    }
  );

  // Get Pinterest boards for account
  fastify.get<{
    Params: { orgId: string; accountId: string };
  }>(
    "/:accountId/boards",
    { preHandler: [authenticate, requireOrgMembership] },
    async (request, reply) => {
      const { orgId, accountId } = request.params;

      const accountDoc = await db.socialAccount(orgId, accountId).get();
      if (!accountDoc.exists) {
        throw createError("Account not found", 404);
      }

      const account = accountDoc.data() as SocialAccount;
      if (account.platform !== "pinterest") {
        throw createError("Board listing is only available for Pinterest accounts", 400);
      }

      const boards = await getPinterestBoards(account.accessToken);

      return reply.send({
        success: true,
        data: boards,
      });
    }
  );
}
