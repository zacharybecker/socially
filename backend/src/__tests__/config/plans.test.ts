import { describe, it, expect } from "vitest";
import { PLAN_CONFIGS, getPlanConfig, getPlanLimits } from "../../config/plans.js";

describe("Plan Config", () => {
  describe("PLAN_CONFIGS", () => {
    it("has all four plan tiers", () => {
      expect(Object.keys(PLAN_CONFIGS)).toEqual([
        "free",
        "creator",
        "business",
        "agency",
      ]);
    });

    it("has increasing prices across tiers", () => {
      expect(PLAN_CONFIGS.free.monthlyPrice).toBe(0);
      expect(PLAN_CONFIGS.creator.monthlyPrice).toBe(15);
      expect(PLAN_CONFIGS.business.monthlyPrice).toBe(49);
      expect(PLAN_CONFIGS.agency.monthlyPrice).toBe(149);
    });

    it("has yearly prices lower than 12x monthly", () => {
      for (const tier of ["creator", "business", "agency"] as const) {
        const config = PLAN_CONFIGS[tier];
        expect(config.yearlyPrice).toBeLessThan(config.monthlyPrice * 12);
      }
    });

    it("free plan has no stripe price IDs", () => {
      expect(PLAN_CONFIGS.free.stripePriceIdMonthly).toBe("");
      expect(PLAN_CONFIGS.free.stripePriceIdYearly).toBe("");
    });
  });

  describe("getPlanConfig", () => {
    it("returns correct config for each tier", () => {
      const freeConfig = getPlanConfig("free");
      expect(freeConfig.tier).toBe("free");
      expect(freeConfig.name).toBe("Free");

      const creatorConfig = getPlanConfig("creator");
      expect(creatorConfig.tier).toBe("creator");
      expect(creatorConfig.name).toBe("Creator");
    });
  });

  describe("getPlanLimits", () => {
    it("returns limits for free plan", () => {
      const limits = getPlanLimits("free");
      expect(limits.socialAccounts).toBe(2);
      expect(limits.postsPerMonth).toBe(10);
      expect(limits.brandVoice).toBe(false);
      expect(limits.apiAccess).toBe(false);
    });

    it("returns limits for creator plan", () => {
      const limits = getPlanLimits("creator");
      expect(limits.socialAccounts).toBe(5);
      expect(limits.postsPerMonth).toBe(-1); // unlimited
      expect(limits.brandVoice).toBe(true);
    });

    it("returns limits for business plan", () => {
      const limits = getPlanLimits("business");
      expect(limits.socialAccounts).toBe(15);
      expect(limits.teamMembers).toBe(5);
      expect(limits.contentApproval).toBe(true);
    });

    it("returns limits for agency plan", () => {
      const limits = getPlanLimits("agency");
      expect(limits.socialAccounts).toBe(-1); // unlimited
      expect(limits.teamMembers).toBe(-1); // unlimited
      expect(limits.apiAccess).toBe(true);
    });

    it("higher tiers have more storage", () => {
      const free = getPlanLimits("free");
      const creator = getPlanLimits("creator");
      const business = getPlanLimits("business");
      const agency = getPlanLimits("agency");

      expect(creator.storageMB).toBeGreaterThan(free.storageMB);
      expect(business.storageMB).toBeGreaterThan(creator.storageMB);
      expect(agency.storageMB).toBeGreaterThan(business.storageMB);
    });

    it("higher tiers have more analytics retention", () => {
      const free = getPlanLimits("free");
      const creator = getPlanLimits("creator");
      const business = getPlanLimits("business");
      const agency = getPlanLimits("agency");

      expect(creator.analyticsRetentionDays).toBeGreaterThan(
        free.analyticsRetentionDays
      );
      expect(business.analyticsRetentionDays).toBeGreaterThan(
        creator.analyticsRetentionDays
      );
      expect(agency.analyticsRetentionDays).toBeGreaterThan(
        business.analyticsRetentionDays
      );
    });
  });
});
