"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartWrapper } from "./chart-wrapper";
import { CustomTooltip } from "./custom-tooltip";
import type { DailyMetrics } from "@/types";

interface FollowerGrowthChartProps {
  data: DailyMetrics[];
}

export function FollowerGrowthChart({ data }: FollowerGrowthChartProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    followers: d.followers,
    change: d.followerChange,
  }));

  return (
    <ChartWrapper height={300}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="followerGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          stroke="#94a3b8"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          stroke="#94a3b8"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickLine={false}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v
          }
        />
        <Tooltip
          content={
            <CustomTooltip
              formatValue={(v, name) =>
                name === "Change"
                  ? `${v >= 0 ? "+" : ""}${v.toLocaleString()}`
                  : v.toLocaleString()
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="followers"
          name="Followers"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#followerGradient)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ChartWrapper>
  );
}
