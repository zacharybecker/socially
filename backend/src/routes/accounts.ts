import { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate, requireOrgMembership } from "../middleware/auth.js";
import { db } from "../services/firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { SocialAccount, SocialAccountResponse, Platform } from "../types/index.js";
import { createError } from "../middleware/errorHandler.js";

const callbackStateSchema = z.object({
  orgId: z.string().min(1),
  userId: z.string().min(1),
});
import { getTikTokAuthUrl, exchangeTikTokCode, refreshTikTokToken } from "../services/tiktok.js";
import { getInstagramAuthUrl, exchangeInstagramCode, refreshInstagramToken } from "../services/instagram.js";

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
      const state = Buffer.from(
        JSON.stringify({ orgId, userId: request.user!.uid })
      ).toString("base64");

      switch (platform) {
        case "tiktok":
          authUrl = getTikTokAuthUrl(state);
          break;
        case "instagram":
          authUrl = getInstagramAuthUrl(state);
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
        let decoded: unknown;
        try {
          decoded = JSON.parse(Buffer.from(state, "base64").toString());
        } catch {
          throw createError("Invalid OAuth state parameter", 400);
        }
        const { orgId, userId } = callbackStateSchema.parse(decoded);

        let accountData: Partial<SocialAccount>;

        switch (platform) {
          case "tiktok":
            accountData = await exchangeTikTokCode(code);
            break;
          case "instagram":
            accountData = await exchangeInstagramCode(code);
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

      if (accountData.platform === "tiktok" && accountData.refreshToken) {
        const result = await refreshTikTokToken(accountData.refreshToken);
        updateData.accessToken = result.accessToken;
        updateData.refreshToken = result.refreshToken;
        updateData.tokenExpiresAt = Timestamp.fromDate(
          new Date(Date.now() + result.expiresIn * 1000)
        );
      } else if (accountData.platform === "instagram") {
        const result = await refreshInstagramToken(accountData.accessToken);
        updateData.accessToken = result.accessToken;
        updateData.tokenExpiresAt = Timestamp.fromDate(
          new Date(Date.now() + result.expiresIn * 1000)
        );
      } else {
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
}
