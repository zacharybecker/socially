import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock firebase before imports
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();

vi.mock("../../services/firebase.js", () => ({
  db: {
    user: vi.fn(() => ({
      get: mockGet,
    })),
    users: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ docs: [], size: 0 }),
    })),
    usagePeriod: vi.fn(() => ({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    })),
  },
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: (n: number) => ({ _increment: n }),
  },
}));

vi.mock("../../config/plans.js", () => ({
  getPlanLimits: (tier: string) => {
    const limits: Record<string, Record<string, number | boolean>> = {
      free: {
        postsPerMonth: 10,
        aiCreditsPerMonth: 20,
        imageGenerations: 0,
        videoGenerations: 0,
        storageMB: 100,
        socialAccounts: 2,
        teamMembers: 1,
        analyticsRetentionDays: 7,
        brandVoice: false,
        contentApproval: false,
        apiAccess: false,
      },
      creator: {
        postsPerMonth: -1,
        aiCreditsPerMonth: 200,
        imageGenerations: 10,
        videoGenerations: 2,
        storageMB: 1024,
        socialAccounts: 5,
        teamMembers: 1,
        analyticsRetentionDays: 30,
        brandVoice: true,
        contentApproval: false,
        apiAccess: false,
      },
    };
    return limits[tier] || limits.free;
  },
}));

import { getUsage, incrementUsage, checkLimit, resetMonthlyUsage } from "../../services/usage.js";

describe("Usage Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUsage", () => {
    it("returns existing usage when document exists", async () => {
      const mockUsage = {
        postsCreated: 5,
        aiCreditsUsed: 10,
        imageGenerationsUsed: 1,
        videoGenerationsUsed: 0,
        storageMBUsed: 50,
      };
      mockGet.mockResolvedValueOnce({ exists: true, data: () => mockUsage });

      const result = await getUsage("user-1");

      expect(result).toEqual(mockUsage);
    });

    it("creates default usage when document does not exist", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await getUsage("user-1");

      expect(mockSet).toHaveBeenCalledWith({
        postsCreated: 0,
        aiCreditsUsed: 0,
        imageGenerationsUsed: 0,
        videoGenerationsUsed: 0,
        storageMBUsed: 0,
      });
      expect(result.postsCreated).toBe(0);
      expect(result.aiCreditsUsed).toBe(0);
    });
  });

  describe("incrementUsage", () => {
    it("creates new document with incremented value when document does not exist", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      await incrementUsage("user-1", "postsCreated", 1);

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ postsCreated: 1 })
      );
    });

    it("updates existing document with increment", async () => {
      mockGet.mockResolvedValueOnce({ exists: true });

      await incrementUsage("user-1", "aiCreditsUsed", 3);

      expect(mockUpdate).toHaveBeenCalledWith({
        aiCreditsUsed: { _increment: 3 },
      });
    });

    it("defaults increment amount to 1", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      await incrementUsage("user-1", "postsCreated");

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ postsCreated: 1 })
      );
    });
  });

  describe("checkLimit", () => {
    it("allows when under limit", async () => {
      // Mock user doc for plan tier
      mockGet.mockResolvedValueOnce({
        data: () => ({ planTier: "free" }),
      });
      // Mock usage doc
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          postsCreated: 5,
          aiCreditsUsed: 0,
          imageGenerationsUsed: 0,
          videoGenerationsUsed: 0,
          storageMBUsed: 0,
        }),
      });

      const result = await checkLimit("user-1", "postsCreated");

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(5);
      expect(result.limit).toBe(10);
    });

    it("blocks when at limit", async () => {
      mockGet.mockResolvedValueOnce({
        data: () => ({ planTier: "free" }),
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          postsCreated: 10,
          aiCreditsUsed: 0,
          imageGenerationsUsed: 0,
          videoGenerationsUsed: 0,
          storageMBUsed: 0,
        }),
      });

      const result = await checkLimit("user-1", "postsCreated");

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(10);
      expect(result.limit).toBe(10);
    });

    it("returns unlimited for -1 limits", async () => {
      mockGet.mockResolvedValueOnce({
        data: () => ({ planTier: "creator" }),
      });

      const result = await checkLimit("user-1", "postsCreated");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it("defaults to free plan when user has no planTier", async () => {
      mockGet.mockResolvedValueOnce({
        data: () => ({}),
      });
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          postsCreated: 5,
          aiCreditsUsed: 0,
          imageGenerationsUsed: 0,
          videoGenerationsUsed: 0,
          storageMBUsed: 0,
        }),
      });

      const result = await checkLimit("user-1", "postsCreated");

      expect(result.limit).toBe(10); // free plan limit
    });
  });

  describe("resetMonthlyUsage", () => {
    it("resets usage for all users", async () => {
      const { db } = await import("../../services/firebase.js");
      (db.users as ReturnType<typeof vi.fn>).mockReturnValueOnce({
        get: vi.fn().mockResolvedValue({
          docs: [{ id: "user-1" }, { id: "user-2" }],
          size: 2,
        }),
      });

      await resetMonthlyUsage();

      expect(mockSet).toHaveBeenCalledTimes(2);
    });
  });
});
