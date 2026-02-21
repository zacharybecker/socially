"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { api, endpoints } from "@/lib/api";
import { PlanTier } from "@/types";

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan: PlanTier | null;
}

const planDetails: Record<string, { name: string; price: number; highlights: string[] }> = {
  creator: {
    name: "Creator",
    price: 15,
    highlights: ["5 social accounts", "100 posts/month", "200 AI credits", "50 image generations", "Brand voice"],
  },
  business: {
    name: "Business",
    price: 49,
    highlights: ["15 social accounts", "Unlimited posts", "1,000 AI credits", "200 image generations", "Content approval"],
  },
  agency: {
    name: "Agency",
    price: 149,
    highlights: ["Unlimited accounts", "Unlimited posts", "5,000 AI credits", "1,000 image generations", "API access"],
  },
};

export function UpgradeDialog({ open, onOpenChange, targetPlan }: UpgradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

  if (!targetPlan || !planDetails[targetPlan]) return null;

  const plan = planDetails[targetPlan];
  const yearlyPrice = Math.round(plan.price * 10); // 2 months free

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await api.post<{ success: boolean; data: { url: string } }>(
        endpoints.billing.createCheckout,
        {
          priceId: `${targetPlan}_${period}`,
          period,
        }
      );
      window.location.href = response.data.url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            Upgrade to {plan.name}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Unlock more features for your social media workflow
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period toggle */}
          <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-700/50">
            <button
              onClick={() => setPeriod("monthly")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                period === "monthly"
                  ? "bg-slate-600 text-white"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod("yearly")}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                period === "yearly"
                  ? "bg-slate-600 text-white"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              Yearly
              <Badge className="ml-2 bg-green-600/20 text-green-400 text-xs">Save 17%</Badge>
            </button>
          </div>

          {/* Price */}
          <div className="text-center py-2">
            <span className="text-4xl font-bold text-white">
              ${period === "monthly" ? plan.price : yearlyPrice}
            </span>
            <span className="text-slate-400">/{period === "monthly" ? "mo" : "yr"}</span>
          </div>

          {/* Features */}
          <ul className="space-y-2">
            {plan.highlights.map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Continue to Checkout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
