"use client";

import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanTier } from "@/types";

interface PlanComparisonProps {
  currentPlan: PlanTier;
  onSelectPlan: (tier: PlanTier) => void;
}

const plans = [
  {
    tier: "free" as PlanTier,
    name: "Free",
    price: 0,
    features: {
      socialAccounts: "2",
      postsPerMonth: "10",
      aiCredits: "20",
      imageGenerations: "5",
      videoGenerations: "0",
      teamMembers: "1",
      storage: "100 MB",
      analyticsRetention: "7 days",
      brandVoice: false,
      contentApproval: false,
      apiAccess: false,
    },
  },
  {
    tier: "creator" as PlanTier,
    name: "Creator",
    price: 15,
    features: {
      socialAccounts: "5",
      postsPerMonth: "100",
      aiCredits: "200",
      imageGenerations: "50",
      videoGenerations: "5",
      teamMembers: "1",
      storage: "1 GB",
      analyticsRetention: "30 days",
      brandVoice: true,
      contentApproval: false,
      apiAccess: false,
    },
  },
  {
    tier: "business" as PlanTier,
    name: "Business",
    price: 49,
    popular: true,
    features: {
      socialAccounts: "15",
      postsPerMonth: "Unlimited",
      aiCredits: "1,000",
      imageGenerations: "200",
      videoGenerations: "20",
      teamMembers: "5",
      storage: "10 GB",
      analyticsRetention: "90 days",
      brandVoice: true,
      contentApproval: true,
      apiAccess: false,
    },
  },
  {
    tier: "agency" as PlanTier,
    name: "Agency",
    price: 149,
    features: {
      socialAccounts: "Unlimited",
      postsPerMonth: "Unlimited",
      aiCredits: "5,000",
      imageGenerations: "1,000",
      videoGenerations: "100",
      teamMembers: "Unlimited",
      storage: "100 GB",
      analyticsRetention: "365 days",
      brandVoice: true,
      contentApproval: true,
      apiAccess: true,
    },
  },
];

const featureRows = [
  { key: "socialAccounts", label: "Social accounts" },
  { key: "postsPerMonth", label: "Posts / month" },
  { key: "aiCredits", label: "AI credits / month" },
  { key: "imageGenerations", label: "Image generations" },
  { key: "videoGenerations", label: "Video generations" },
  { key: "teamMembers", label: "Team members" },
  { key: "storage", label: "Storage" },
  { key: "analyticsRetention", label: "Analytics retention" },
  { key: "brandVoice", label: "Brand voice" },
  { key: "contentApproval", label: "Content approval" },
  { key: "apiAccess", label: "API access" },
] as const;

export function PlanComparison({ currentPlan, onSelectPlan }: PlanComparisonProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-3 text-gray-500 font-medium">Feature</th>
            {plans.map((plan) => (
              <th key={plan.tier} className="p-3 text-center min-w-[140px]">
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-gray-900 font-semibold">{plan.name}</span>
                    {plan.tier === currentPlan && (
                      <Badge className="bg-coral-500/10 text-coral-500 text-xs">Current</Badge>
                    )}
                    {"popular" in plan && plan.popular && plan.tier !== currentPlan && (
                      <Badge className="bg-coral-500/10 text-coral-500 text-xs">Popular</Badge>
                    )}
                  </div>
                  <div className="text-gray-900 font-bold text-lg">
                    {plan.price === 0 ? "Free" : `$${plan.price}`}
                    {plan.price > 0 && <span className="text-xs font-normal text-gray-500">/mo</span>}
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featureRows.map((row) => (
            <tr key={row.key} className="border-t border-gray-200">
              <td className="p-3 text-gray-700">{row.label}</td>
              {plans.map((plan) => {
                const value = plan.features[row.key];
                return (
                  <td key={plan.tier} className="p-3 text-center">
                    {typeof value === "boolean" ? (
                      value ? (
                        <Check className="h-4 w-4 text-green-400 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300 mx-auto" />
                      )
                    ) : (
                      <span className="text-gray-800">{value}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t border-gray-200">
            <td className="p-3" />
            {plans.map((plan) => (
              <td key={plan.tier} className="p-3 text-center">
                {plan.tier === currentPlan ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-500"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-coral-500 hover:bg-coral-600 text-white"
                    onClick={() => onSelectPlan(plan.tier)}
                  >
                    {plans.findIndex((p) => p.tier === plan.tier) >
                    plans.findIndex((p) => p.tier === currentPlan)
                      ? "Upgrade"
                      : "Downgrade"}
                  </Button>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
