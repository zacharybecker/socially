import { describe, it, expect } from "vitest";
import { endpoints } from "@/lib/api";

describe("API Endpoints", () => {
  describe("auth endpoints", () => {
    it("has correct auth endpoints", () => {
      expect(endpoints.auth.me).toBe("/auth/me");
      expect(endpoints.auth.updateProfile).toBe("/auth/profile");
    });
  });

  describe("organizations endpoints", () => {
    it("has correct static endpoints", () => {
      expect(endpoints.organizations.list).toBe("/organizations");
      expect(endpoints.organizations.create).toBe("/organizations");
    });

    it("generates correct parameterized endpoints", () => {
      expect(endpoints.organizations.get("org-1")).toBe("/organizations/org-1");
      expect(endpoints.organizations.update("org-1")).toBe(
        "/organizations/org-1"
      );
      expect(endpoints.organizations.delete("org-1")).toBe(
        "/organizations/org-1"
      );
      expect(endpoints.organizations.members("org-1")).toBe(
        "/organizations/org-1/members"
      );
    });
  });

  describe("accounts endpoints", () => {
    it("generates correct endpoints", () => {
      expect(endpoints.accounts.list("org-1")).toBe(
        "/organizations/org-1/accounts"
      );
      expect(endpoints.accounts.connect("org-1", "tiktok")).toBe(
        "/organizations/org-1/accounts/connect/tiktok"
      );
      expect(endpoints.accounts.disconnect("org-1", "acc-1")).toBe(
        "/organizations/org-1/accounts/acc-1"
      );
    });
  });

  describe("posts endpoints", () => {
    it("generates correct endpoints", () => {
      expect(endpoints.posts.list("org-1")).toBe(
        "/organizations/org-1/posts"
      );
      expect(endpoints.posts.get("org-1", "post-1")).toBe(
        "/organizations/org-1/posts/post-1"
      );
      expect(endpoints.posts.publish("org-1", "post-1")).toBe(
        "/organizations/org-1/posts/post-1/publish"
      );
      expect(endpoints.posts.schedule("org-1", "post-1")).toBe(
        "/organizations/org-1/posts/post-1/schedule"
      );
    });
  });

  describe("media endpoints", () => {
    it("generates correct endpoints", () => {
      expect(endpoints.media.upload("org-1")).toBe(
        "/organizations/org-1/media/upload"
      );
      expect(endpoints.media.delete("org-1", "media-1")).toBe(
        "/organizations/org-1/media/media-1"
      );
    });
  });

  describe("ai endpoints", () => {
    it("has correct static AI endpoints", () => {
      expect(endpoints.ai.generateHook).toBe("/ai/generate-hook");
      expect(endpoints.ai.generateCaption).toBe("/ai/generate-caption");
      expect(endpoints.ai.generateIdeas).toBe("/ai/generate-ideas");
      expect(endpoints.ai.generateScript).toBe("/ai/generate-script");
      expect(endpoints.ai.generateHashtags).toBe("/ai/generate-hashtags");
      expect(endpoints.ai.analyzeContent).toBe("/ai/analyze-content");
      expect(endpoints.ai.generateImage).toBe("/ai/generate-image");
      expect(endpoints.ai.generateVideo).toBe("/ai/generate-video");
    });

    it("generates correct parameterized endpoints", () => {
      expect(endpoints.ai.videoJob("job-1")).toBe("/ai/video-jobs/job-1");
    });
  });

  describe("analytics endpoints", () => {
    it("generates correct endpoints", () => {
      expect(endpoints.analytics.overview("org-1")).toBe(
        "/organizations/org-1/analytics/overview"
      );
      expect(endpoints.analytics.posts("org-1", "post-1")).toBe(
        "/organizations/org-1/analytics/posts/post-1"
      );
      expect(endpoints.analytics.accounts("org-1", "acc-1")).toBe(
        "/organizations/org-1/analytics/accounts/acc-1"
      );
    });
  });

  describe("billing endpoints", () => {
    it("has correct billing endpoints", () => {
      expect(endpoints.billing.createCheckout).toBe("/billing/create-checkout");
      expect(endpoints.billing.customerPortal).toBe("/billing/customer-portal");
      expect(endpoints.billing.subscription).toBe("/billing/subscription");
      expect(endpoints.billing.usage).toBe("/billing/usage");
    });
  });

  describe("brandVoice endpoints", () => {
    it("generates correct endpoints", () => {
      expect(endpoints.brandVoice.get("org-1")).toBe(
        "/organizations/org-1/brand-voice"
      );
      expect(endpoints.brandVoice.update("org-1")).toBe(
        "/organizations/org-1/brand-voice"
      );
      expect(endpoints.brandVoice.analyze("org-1")).toBe(
        "/organizations/org-1/brand-voice/analyze"
      );
    });
  });

  describe("aiSuggestions endpoints", () => {
    it("generates correct endpoints", () => {
      expect(endpoints.aiSuggestions.list("org-1")).toBe(
        "/organizations/org-1/ai-suggestions"
      );
      expect(endpoints.aiSuggestions.dismiss("org-1", "sug-1")).toBe(
        "/organizations/org-1/ai-suggestions/sug-1/dismiss"
      );
      expect(endpoints.aiSuggestions.apply("org-1", "sug-1")).toBe(
        "/organizations/org-1/ai-suggestions/sug-1/apply"
      );
    });
  });
});
