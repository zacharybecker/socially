"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ChartWrapper } from "./chart-wrapper";
import { CustomTooltip } from "./custom-tooltip";
import type { DailyMetrics } from "@/types";

interface EngagementTypeStackedProps {
  data: DailyMetrics[];
}

const COLORS = {
  likes: "#f43f5e",
  comments: "#f59e0b",
  shares: "#06b6d4",
  saves: "#ec4899",
};

export function EngagementTypeStacked({ data }: EngagementTypeStackedProps) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    likes: d.likes,
    comments: d.comments,
    shares: d.shares,
    saves: d.saves,
  }));

  return (
    <ChartWrapper height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          stroke="#6b7280"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          stroke="#6b7280"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          tickLine={false}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : v
          }
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          height={36}
          formatter={(value) => (
            <span className="text-xs text-gray-700 capitalize">{value}</span>
          )}
        />
        <Bar dataKey="likes" name="Likes" stackId="a" fill={COLORS.likes} radius={[0, 0, 0, 0]} />
        <Bar dataKey="comments" name="Comments" stackId="a" fill={COLORS.comments} />
        <Bar dataKey="shares" name="Shares" stackId="a" fill={COLORS.shares} />
        <Bar dataKey="saves" name="Saves" stackId="a" fill={COLORS.saves} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartWrapper>
  );
}
