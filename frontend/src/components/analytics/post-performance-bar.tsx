"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartWrapper } from "./chart-wrapper";
import { CustomTooltip } from "./custom-tooltip";
import type { TopPost } from "@/types";

interface PostPerformanceBarProps {
  data: TopPost[];
  metric?: "impressions" | "engagements" | "likes" | "comments" | "shares";
}

const METRIC_COLORS: Record<string, string> = {
  impressions: "#3b82f6",
  engagements: "#10b981",
  likes: "#f43f5e",
  comments: "#f59e0b",
  shares: "#06b6d4",
};

export function PostPerformanceBar({
  data,
  metric = "engagements",
}: PostPerformanceBarProps) {
  const chartData = data.map((post, i) => ({
    name: `Post ${i + 1}`,
    [metric]: post[metric],
    content: post.content.slice(0, 50) + (post.content.length > 50 ? "..." : ""),
  }));

  return (
    <ChartWrapper height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="name"
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
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey={metric}
          name={metric.charAt(0).toUpperCase() + metric.slice(1)}
          fill={METRIC_COLORS[metric]}
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ChartWrapper>
  );
}
