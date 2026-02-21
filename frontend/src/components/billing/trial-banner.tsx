"use client";

import { useState } from "react";
import { X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks";
import { UpgradeDialog } from "./upgrade-dialog";

export function TrialBanner() {
  const { userProfile } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (dismissed || !userProfile?.trialEndsAt) return null;

  const trialEnd = new Date(userProfile.trialEndsAt);
  const now = new Date();
  const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  if (daysRemaining <= 0 || userProfile.subscriptionStatus !== "trialing") return null;

  return (
    <>
      <div className="relative flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-600/90 to-purple-600/90 text-white text-sm">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4" />
          <span>
            <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong> left in your trial.
            Upgrade now to keep your features.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="bg-white/20 text-white hover:bg-white/30 h-7 text-xs"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade Now
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-white/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        targetPlan="creator"
      />
    </>
  );
}
