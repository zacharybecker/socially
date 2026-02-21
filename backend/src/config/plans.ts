import { PlanTier, PlanLimits } from "../types/index.js";

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  limits: PlanLimits;
  features: string[];
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: "free",
    name: "Free",
    description: "Get started with basic social media management",
    monthlyPrice: 0,
    yearlyPrice: 0,
    stripePriceIdMonthly: "",
    stripePriceIdYearly: "",
    limits: {
      socialAccounts: 2,
      postsPerMonth: 10,
      aiCreditsPerMonth: 20,
      imageGenerations: 0,
      videoGenerations: 0,
      teamMembers: 1,
      storageMB: 100,
      analyticsRetentionDays: 7,
      brandVoice: false,
      contentApproval: false,
      apiAccess: false,
    },
    features: [
      "2 social accounts",
      "10 posts per month",
      "20 AI credits per month",
      "7-day analytics",
      "Basic scheduling",
    ],
  },
  creator: {
    tier: "creator",
    name: "Creator",
    description: "Everything you need to grow your personal brand",
    monthlyPrice: 15,
    yearlyPrice: 144,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_CREATOR_MONTHLY || "",
    stripePriceIdYearly: process.env.STRIPE_PRICE_CREATOR_YEARLY || "",
    limits: {
      socialAccounts: 5,
      postsPerMonth: -1,
      aiCreditsPerMonth: 200,
      imageGenerations: 10,
      videoGenerations: 2,
      teamMembers: 1,
      storageMB: 1024,
      analyticsRetentionDays: 30,
      brandVoice: true,
      contentApproval: false,
      apiAccess: false,
    },
    features: [
      "5 social accounts",
      "Unlimited posts",
      "200 AI credits per month",
      "10 image generations",
      "2 video generations",
      "30-day analytics",
      "Brand voice",
      "1 GB storage",
    ],
  },
  business: {
    tier: "business",
    name: "Business",
    description: "Advanced tools for growing teams and businesses",
    monthlyPrice: 49,
    yearlyPrice: 470,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || "",
    stripePriceIdYearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY || "",
    limits: {
      socialAccounts: 15,
      postsPerMonth: -1,
      aiCreditsPerMonth: 1000,
      imageGenerations: 50,
      videoGenerations: 10,
      teamMembers: 5,
      storageMB: 5120,
      analyticsRetentionDays: 90,
      brandVoice: true,
      contentApproval: true,
      apiAccess: false,
    },
    features: [
      "15 social accounts",
      "Unlimited posts",
      "1,000 AI credits per month",
      "50 image generations",
      "10 video generations",
      "5 team members",
      "90-day analytics",
      "Brand voice",
      "Content approval workflows",
      "5 GB storage",
    ],
  },
  agency: {
    tier: "agency",
    name: "Agency",
    description: "Enterprise-grade tools for agencies managing multiple brands",
    monthlyPrice: 149,
    yearlyPrice: 1430,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_AGENCY_MONTHLY || "",
    stripePriceIdYearly: process.env.STRIPE_PRICE_AGENCY_YEARLY || "",
    limits: {
      socialAccounts: -1,
      postsPerMonth: -1,
      aiCreditsPerMonth: -1,
      imageGenerations: -1,
      videoGenerations: 50,
      teamMembers: -1,
      storageMB: 51200,
      analyticsRetentionDays: 365,
      brandVoice: true,
      contentApproval: true,
      apiAccess: true,
    },
    features: [
      "Unlimited social accounts",
      "Unlimited posts",
      "Unlimited AI credits",
      "Unlimited image generations",
      "50 video generations",
      "Unlimited team members",
      "365-day analytics",
      "Brand voice",
      "Content approval workflows",
      "API access",
      "50 GB storage",
    ],
  },
};

export function getPlanConfig(tier: PlanTier): PlanConfig {
  return PLAN_CONFIGS[tier];
}

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_CONFIGS[tier].limits;
}
