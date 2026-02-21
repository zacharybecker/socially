"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartWrapper } from "./chart-wrapper";
import { CustomTooltip } from "./custom-tooltip";
import type { DailyMetrics } from "@/types";

const METRIC_COLORS: Record<string, string> = {
  impressions: "#3b82f6",
  reach: "#8b5cf6",
  engagements: "#10b981",
  likes: "#f43f5e",
  comments: "#f59e0b",
  shares: "#06b6d4",
  saves: "#ec4899",
  videoViews: "#6366f1",
};

const METRIC_LABELS: Record<string, string> = {
  impressions: "Impressions",
  reach: "Reach",
  engagements: "Engagements",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  saves: "Saves",
  videoViews: "Video Views",
};

interface EngagementLineChartProps {
  data: DailyMetrics[];
  metrics?: string[];
}

export function EngagementLineChart({
  data,
  metrics = ["impressions", "engagements", "reach"],
}: EngagementLineChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<Set<string>>(
    new Set(metrics)
  );

  const toggleMetric = (metric: string) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(metric)) {
        if (next.size > 1) next.delete(metric);
      } else {
        next.add(metric);
      }
      return next;
    });
  };

  const chartData = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {metrics.map((metric) => (
          <button
            key={metric}
            onClick={() => toggleMetric(metric)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              activeMetrics.has(metric)
                ? "bg-slate-700 text-white"
                : "bg-slate-800 text-slate-500 hover:text-slate-400"
            }`}
          >
            <div
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: activeMetrics.has(metric)
                  ? METRIC_COLORS[metric]
                  : "#475569",
              }}
            />
            {METRIC_LABELS[metric] || metric}
          </button>
        ))}
      </div>
      <ChartWrapper height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <defs>
            {metrics.map((metric) => (
              <linearGradient
                key={metric}
                id={`gradient-${metric}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={METRIC_COLORS[metric]}
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor={METRIC_COLORS[metric]}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
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
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ display: "none" }}
          />
          {metrics.map(
            (metric) =>
              activeMetrics.has(metric) && (
                <Area
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  name={METRIC_LABELS[metric] || metric}
                  stroke={METRIC_COLORS[metric]}
                  strokeWidth={2}
                  fill={`url(#gradient-${metric})`}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )
          )}
        </AreaChart>
      </ChartWrapper>
    </div>
  );
}
