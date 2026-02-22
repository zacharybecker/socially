"use client";

import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "./sparkline";

interface StatsCardProps {
  title: string;
  value: string;
  change?: number;
  changePercent?: number;
  sparklineData?: number[];
  icon: LucideIcon;
  color?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changePercent,
  sparklineData,
  icon: Icon,
  color = "#3b82f6",
}: StatsCardProps) {
  const isPositive = (changePercent ?? 0) >= 0;

  return (
    <Card className="bg-gray-50 border-gray-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <Icon className="h-4 w-4 text-gray-500" />
          {changePercent !== undefined && (
            <div
              className={`flex items-center gap-0.5 text-xs font-medium ${
                isPositive ? "text-green-400" : "text-red-400"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {isPositive ? "+" : ""}
              {changePercent.toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mb-2">{title}</p>
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} color={color} height={28} />
        )}
      </CardContent>
    </Card>
  );
}
