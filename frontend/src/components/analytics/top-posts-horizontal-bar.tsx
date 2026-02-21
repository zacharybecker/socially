"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { ChartWrapper } from "./chart-wrapper";
import type { TopPost } from "@/types";

interface TopPostsHorizontalBarProps {
  data: TopPost[];
}

export function TopPostsHorizontalBar({ data }: TopPostsHorizontalBarProps) {
  const chartData = data.slice(0, 8).map((post) => ({
    name:
      post.content.slice(0, 35) + (post.content.length > 35 ? "..." : ""),
    engagements: post.engagements,
    platform: post.platform,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
        No post data available
      </div>
    );
  }

  return (
    <ChartWrapper height={300}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
      >
        <XAxis
          type="number"
          stroke="#94a3b8"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
          tickLine={false}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v
          }
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="#94a3b8"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          tickLine={false}
          width={150}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const item = payload[0].payload;
            return (
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 shadow-xl">
                <p className="mb-1 text-xs font-medium text-white">
                  {item.name}
                </p>
                <p className="text-xs text-slate-300">
                  {item.engagements.toLocaleString()} engagements
                </p>
                <p className="text-xs text-slate-400 capitalize">
                  {item.platform}
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="engagements"
          fill="#8b5cf6"
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
        />
      </BarChart>
    </ChartWrapper>
  );
}
