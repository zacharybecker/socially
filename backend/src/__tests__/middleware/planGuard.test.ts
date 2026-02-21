import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUserGet = vi.fn();
const mockCheckLimit = vi.fn();

vi.mock("../../services/firebase.js", () => ({
  db: {
    user: vi.fn(() => ({
      get: mockUserGet,
    })),
  },
}));

vi.mock("../../config/plans.js", () => ({
  getPlanLimits: (tier: string) => {
    const limits: Record<string, Record<string, boolean | number>> = {
      free: {
        brandVoice: false,
        contentApproval: false,
        apiAccess: false,
        postsPerMonth: 10,
        aiCreditsPerMonth: 20,
        imageGenerations: 0,
        videoGenerations: 0,
        socialAccounts: 2,
        teamMembers: 1,
        storageMB: 100,
        analyticsRetentionDays: 7,
      },
      business: {
        brandVoice: true,
        contentApproval: true,
        apiAccess: false,
        postsPerMonth: -1,
        aiCreditsPerMonth: 1000,
        imageGenerations: 50,
        videoGenerations: 10,
        socialAccounts: 15,
        teamMembers: 5,
        storageMB: 5120,
        analyticsRetentionDays: 90,
      },
    };
    return limits[tier] || limits.free;
  },
}));

vi.mock("../../services/usage.js", () => ({
  checkLimit: (...args: unknown[]) => mockCheckLimit(...args),
}));

import { requireFeature, requireQuota } from "../../middleware/planGuard.js";

function createMockRequest(uid: string) {
  return {
    user: { uid },
  } as unknown as Parameters<ReturnType<typeof requireFeature>>[0];
}

function createMockReply() {
  const reply = {
    statusCode: 200,
    body: null as unknown,
    status: vi.fn().mockImplementation((code: number) => {
      reply.statusCode = code;
      return reply;
    }),
    send: vi.fn().mockImplementation((body: unknown) => {
      reply.body = body;
      return reply;
    }),
  };
  return reply as unknown as Parameters<ReturnType<typeof requireFeature>>[1];
}

describe("planGuard middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireFeature", () => {
    it("allows access when feature is enabled for plan", async () => {
      mockUserGet.mockResolvedValueOnce({
        data: () => ({ planTier: "business" }),
      });

      const middleware = requireFeature("brandVoice");
      const request = createMockRequest("user-1");
      const reply = createMockReply();

      await middleware(request, reply);

      expect(reply.status).not.toHaveBeenCalled();
    });

    it("blocks access when feature is not available on plan", async () => {
      mockUserGet.mockResolvedValueOnce({
        data: () => ({ planTier: "free" }),
      });

      const middleware = requireFeature("brandVoice");
      const request = createMockRequest("user-1");
      const reply = createMockReply();

      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: "FEATURE_NOT_AVAILABLE",
        })
      );
    });

    it("defaults to free plan when user has no planTier", async () => {
      mockUserGet.mockResolvedValueOnce({
        data: () => ({}),
      });

      const middleware = requireFeature("contentApproval");
      const request = createMockRequest("user-1");
      const reply = createMockReply();

      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
    });
  });

  describe("requireQuota", () => {
    it("allows when under quota", async () => {
      mockCheckLimit.mockResolvedValueOnce({
        allowed: true,
        current: 5,
        limit: 10,
      });

      const middleware = requireQuota("postsCreated");
      const request = createMockRequest("user-1");
      const reply = createMockReply();

      await middleware(request, reply);

      expect(reply.status).not.toHaveBeenCalled();
    });

    it("blocks when quota exceeded", async () => {
      mockCheckLimit.mockResolvedValueOnce({
        allowed: false,
        current: 10,
        limit: 10,
      });

      const middleware = requireQuota("postsCreated");
      const request = createMockRequest("user-1");
      const reply = createMockReply();

      await middleware(request, reply);

      expect(reply.status).toHaveBeenCalledWith(429);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: "QUOTA_EXCEEDED",
          current: 10,
          limit: 10,
        })
      );
    });
  });
});
