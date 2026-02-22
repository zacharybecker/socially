"use client";

import {
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AIInsight } from "@/types";

const TYPE_CONFIG: Record<
  AIInsight["type"],
  { icon: typeof TrendingUp; label: string; color: string; badgeClass: string }
> = {
  trend: {
    icon: TrendingUp,
    label: "Trend",
    color: "text-blue-400",
    badgeClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  recommendation: {
    icon: Lightbulb,
    label: "Recommendation",
    color: "text-green-400",
    badgeClass: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  alert: {
    icon: AlertTriangle,
    label: "Alert",
    color: "text-yellow-400",
    badgeClass: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  prediction: {
    icon: Sparkles,
    label: "Prediction",
    color: "text-purple-400",
    badgeClass: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
};

interface AIInsightsPanelProps {
  insights: AIInsight[] | undefined;
  isLoading: boolean;
}

export function AIInsightsPanel({ insights, isLoading }: AIInsightsPanelProps) {
  return (
    <Card className="bg-gray-50 border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Sparkles className="h-5 w-5 text-coral-500" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2 text-sm text-gray-500">
              Analyzing your data...
            </span>
          </div>
        ) : !insights?.length ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No insights available</p>
            <p className="mt-1 text-xs text-gray-400">
              Publish more content to generate AI insights
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((insight, i) => {
              const config = TYPE_CONFIG[insight.type];
              const Icon = config.icon;
              return (
                <div
                  key={i}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${config.badgeClass}`}
                    >
                      {config.label}
                    </Badge>
                    <span className="ml-auto text-[10px] text-gray-400">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                  <h4 className="mb-1 text-sm font-medium text-gray-900">
                    {insight.title}
                  </h4>
                  <p className="text-xs leading-relaxed text-gray-500">
                    {insight.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
