"use client";

import type { DailyMetrics } from "@/types";

interface PostingHeatmapProps {
  data: DailyMetrics[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getColor(value: number, max: number): string {
  if (max === 0 || value === 0) return "bg-slate-800";
  const intensity = value / max;
  if (intensity > 0.75) return "bg-blue-500";
  if (intensity > 0.5) return "bg-blue-600";
  if (intensity > 0.25) return "bg-blue-700";
  return "bg-blue-800";
}

export function PostingHeatmap({ data }: PostingHeatmapProps) {
  // Build a map of day-of-week => total posts
  const dayTotals = new Map<number, number>();
  data.forEach((d) => {
    const dayOfWeek = new Date(d.date).getDay();
    dayTotals.set(dayOfWeek, (dayTotals.get(dayOfWeek) || 0) + d.postsPublished);
  });

  // Also aggregate engagements per day for a secondary view
  const dayEngagements = new Map<number, number>();
  data.forEach((d) => {
    const dayOfWeek = new Date(d.date).getDay();
    dayEngagements.set(
      dayOfWeek,
      (dayEngagements.get(dayOfWeek) || 0) + d.engagements
    );
  });

  const maxPosts = Math.max(...Array.from(dayTotals.values()), 1);
  const maxEngagements = Math.max(...Array.from(dayEngagements.values()), 1);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-400">Posts by Day of Week</p>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((day, i) => {
            const posts = dayTotals.get(i) || 0;
            return (
              <div key={day} className="text-center">
                <p className="mb-1 text-[10px] text-slate-500">{day}</p>
                <div
                  className={`flex h-10 items-center justify-center rounded-md text-xs font-medium text-white ${getColor(
                    posts,
                    maxPosts
                  )}`}
                  title={`${posts} posts`}
                >
                  {posts}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-slate-400">
          Engagement by Day of Week
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((day, i) => {
            const eng = dayEngagements.get(i) || 0;
            return (
              <div key={`eng-${day}`} className="text-center">
                <p className="mb-1 text-[10px] text-slate-500">{day}</p>
                <div
                  className={`flex h-10 items-center justify-center rounded-md text-xs font-medium text-white ${getColor(
                    eng,
                    maxEngagements
                  )}`}
                  title={`${eng.toLocaleString()} engagements`}
                >
                  {eng >= 1000
                    ? `${(eng / 1000).toFixed(eng >= 10000 ? 0 : 1)}k`
                    : eng}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-slate-500">
        <span>Less</span>
        <div className="flex gap-0.5">
          <div className="h-3 w-3 rounded-sm bg-slate-800" />
          <div className="h-3 w-3 rounded-sm bg-blue-800" />
          <div className="h-3 w-3 rounded-sm bg-blue-700" />
          <div className="h-3 w-3 rounded-sm bg-blue-600" />
          <div className="h-3 w-3 rounded-sm bg-blue-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
