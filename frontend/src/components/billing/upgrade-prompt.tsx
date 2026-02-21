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
      <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700/50">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex-shrink-0 p-2 rounded-lg bg-blue-500/20">
            <Sparkles className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">
              Upgrade to unlock {feature}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Available on the {planNames[target]} plan and above
            </p>
          </div>
          <Button
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-purple-600 flex-shrink-0"
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
