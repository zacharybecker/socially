"use client";

import { useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanTier } from "@/types";
import { UpgradeDialog } from "./upgrade-dialog";

interface UpgradePromptProps {
  feature: string;
  currentPlan: PlanTier;
}

const nextPlan: Record<string, PlanTier> = {
  free: "creator",
  creator: "business",
  business: "agency",
};

const planNames: Record<string, string> = {
  creator: "Creator",
  business: "Business",
  agency: "Agency",
};

export function UpgradePrompt({ feature, currentPlan }: UpgradePromptProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const target = nextPlan[currentPlan] || "agency";

  return (
    <>
      <Card className="bg-coral-500/5 border-coral-500/20">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex-shrink-0 p-2 rounded-lg bg-coral-500/10">
            <Sparkles className="h-5 w-5 text-coral-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              Upgrade to unlock {feature}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Available on the {planNames[target]} plan and above
            </p>
          </div>
          <Button
            size="sm"
            className="bg-coral-500 hover:bg-coral-600 text-white flex-shrink-0"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        targetPlan={target}
      />
    </>
  );
}
