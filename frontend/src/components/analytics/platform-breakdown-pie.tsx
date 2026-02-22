"use client";

import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ChartWrapper } from "./chart-wrapper";
import type { DailyMetrics, Platform } from "@/types";

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "#000000",
  instagram: "#E4405F",
  youtube: "#FF0000",
  twitter: "#1DA1F2",
  facebook: "#4267B2",
  linkedin: "#0A66C2",
  threads: "#000000",
  pinterest: "#E60023",
};

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  youtube: "YouTube",
  twitter: "Twitter/X",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  threads: "Threads",
  pinterest: "Pinterest",
};

interface PlatformBreakdownPieProps {
  data: DailyMetrics[];
}

export function PlatformBreakdownPie({ data }: PlatformBreakdownPieProps) {
  // Aggregate engagements by platform across all days
  const platformTotals = new Map<string, number>();
  data.forEach((day) => {
    if (!day.platformBreakdown) return;
    Object.entries(day.platformBreakdown).forEach(([platform, metrics]) => {
      const current = platformTotals.get(platform) || 0;
      platformTotals.set(platform, current + metrics.engagements);
    });
  });

  const pieData = Array.from(platformTotals.entries())
    .filter(([, value]) => value > 0)
    .map(([platform, value]) => ({
      name: PLATFORM_LABELS[platform] || platform,
      value,
      platform,
    }));

  if (pieData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
        No platform data available
      </div>
    );
  }

  return (
    <ChartWrapper height={300}>
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {pieData.map((entry) => (
            <Cell
              key={entry.platform}
              fill={PLATFORM_COLORS[entry.platform] || "#64748b"}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0];
            return (
              <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
                <p className="text-xs font-semibold text-gray-900">
                  {item.name}
                </p>
                <p className="text-xs text-gray-700">
                  {(item.value as number).toLocaleString()} engagements
                </p>
              </div>
            );
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value) => (
            <span className="text-xs text-gray-700">{value}</span>
          )}
        />
      </PieChart>
    </ChartWrapper>
  );
}
