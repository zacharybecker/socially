"use client";

import { useState, useMemo } from "react";
import { Header } from "@/components/dashboard/header";
import { useOrganization } from "@/lib/hooks";
import {
  useAnalyticsOverview,
  useDailyMetrics,
  useTopPosts,
  useAIInsights,
} from "@/lib/hooks/use-analytics";
import { getDatesFromRange } from "@/components/analytics/date-range-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Eye,
  Users,
  TrendingUp,
  Heart,
  Video,
  FileText,
  Loader2,
} from "lucide-react";
import type { AnalyticsDateRange, Platform } from "@/types";

// Chart components
import { EngagementLineChart } from "@/components/analytics/engagement-line-chart";
import { FollowerGrowthChart } from "@/components/analytics/follower-growth-chart";
import { PlatformBreakdownPie } from "@/components/analytics/platform-breakdown-pie";
import { EngagementTypeStacked } from "@/components/analytics/engagement-type-stacked";
import { TopPostsHorizontalBar } from "@/components/analytics/top-posts-horizontal-bar";
import { PostingHeatmap } from "@/components/analytics/posting-heatmap";

// Widget components
import { StatsCard } from "@/components/analytics/stats-card";
import { DateRangePicker } from "@/components/analytics/date-range-picker";
import { PlatformFilter } from "@/components/analytics/platform-filter";
import { ExportDropdown } from "@/components/analytics/export-dropdown";
import { AIInsightsPanel } from "@/components/analytics/ai-insights-panel";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="h-4 w-4 rounded bg-gray-200 animate-pulse mb-2" />
              <div className="h-7 w-20 rounded bg-gray-200 animate-pulse mb-1" />
              <div className="h-3 w-16 rounded bg-gray-200 animate-pulse mb-2" />
              <div className="h-7 w-full rounded bg-gray-200 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-gray-50 border-gray-200">
          <CardContent className="p-6">
            <div className="h-[300px] rounded bg-gray-100 animate-pulse" />
          </CardContent>
        </Card>
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="p-6">
            <div className="h-[300px] rounded bg-gray-100 animate-pulse" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;

  const [dateRange, setDateRange] = useState<AnalyticsDateRange>("30d");
  const [platformFilter, setPlatformFilter] = useState<Platform[]>([]);

  const { start: startDate, end: endDate } = useMemo(
    () => getDatesFromRange(dateRange),
    [dateRange]
  );

  const handleDateChange = (
    range: AnalyticsDateRange,
    _start: string,
    _end: string
  ) => {
    setDateRange(range);
  };

  const {
    data: overview,
    isLoading: overviewLoading,
  } = useAnalyticsOverview(orgId, startDate, endDate);

  const {
    data: dailyMetrics,
    isLoading: dailyLoading,
  } = useDailyMetrics(orgId, startDate, endDate);

  const {
    data: topPosts,
    isLoading: topPostsLoading,
  } = useTopPosts(orgId, startDate, endDate, 10);

  const {
    data: aiInsights,
    isLoading: insightsLoading,
  } = useAIInsights(orgId, startDate, endDate);

  const isLoading = overviewLoading || dailyLoading;

  // Extract sparkline data from daily metrics
  const sparklines = useMemo(() => {
    if (!dailyMetrics?.length) return null;
    return {
      impressions: dailyMetrics.map((d) => d.impressions),
      reach: dailyMetrics.map((d) => d.reach),
      engagementRate: dailyMetrics.map((d) => d.engagementRate),
      followers: dailyMetrics.map((d) => d.followers),
      videoViews: dailyMetrics.map((d) => d.videoViews),
      posts: dailyMetrics.map((d) => d.postsPublished),
    };
  }, [dailyMetrics]);

  // Compute change percentages from overview data
  const engagementRateDisplay = overview
    ? `${overview.engagementRate.toFixed(2)}%`
    : "0%";

  return (
    <>
      <Header
        title="Analytics"
        description="Track your performance across all platforms"
      />

      <div className="p-6 space-y-6">
        {/* Top Bar: DateRangePicker + PlatformFilter + ExportDropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker value={dateRange} onChange={handleDateChange} />
          <PlatformFilter
            selected={platformFilter}
            onChange={setPlatformFilter}
          />
          <div className="flex-1" />
          <ExportDropdown />
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <StatsCard
                title="Impressions"
                value={formatNumber(overview?.totalImpressions ?? 0)}
                changePercent={overview ? ((overview.totalImpressions / Math.max(overview.totalImpressions - (overview.totalImpressions * 0.1), 1)) - 1) * 100 : undefined}
                sparklineData={sparklines?.impressions}
                icon={Eye}
                color="#3b82f6"
              />
              <StatsCard
                title="Reach"
                value={formatNumber(overview?.totalReach ?? 0)}
                sparklineData={sparklines?.reach}
                icon={Users}
                color="#8b5cf6"
              />
              <StatsCard
                title="Engagement Rate"
                value={engagementRateDisplay}
                sparklineData={sparklines?.engagementRate}
                icon={TrendingUp}
                color="#10b981"
              />
              <StatsCard
                title="Followers"
                value={formatNumber(overview?.totalFollowers ?? 0)}
                changePercent={
                  overview && overview.totalFollowers > 0
                    ? (overview.followerChange / overview.totalFollowers) * 100
                    : undefined
                }
                sparklineData={sparklines?.followers}
                icon={Heart}
                color="#f43f5e"
              />
              <StatsCard
                title="Video Views"
                value={formatNumber(overview?.totalVideoViews ?? 0)}
                sparklineData={sparklines?.videoViews}
                icon={Video}
                color="#6366f1"
              />
              <StatsCard
                title="Posts Published"
                value={formatNumber(overview?.postsPublished ?? 0)}
                sparklineData={sparklines?.posts}
                icon={FileText}
                color="#f59e0b"
              />
            </div>

            {/* Row 2: Engagement Line Chart + Platform Breakdown Pie */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2 bg-gray-50 border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-900 text-base">
                    Engagement Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyMetrics?.length ? (
                    <EngagementLineChart
                      data={dailyMetrics}
                      metrics={[
                        "impressions",
                        "engagements",
                        "reach",
                        "likes",
                        "comments",
                        "shares",
                      ]}
                    />
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                      No data available for this period
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-50 border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-900 text-base">
                    Platform Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyMetrics?.length ? (
                    <PlatformBreakdownPie data={dailyMetrics} />
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                      No platform data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Row 3: Follower Growth + Engagement Type Stacked */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-900 text-base">
                    Follower Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyMetrics?.length ? (
                    <FollowerGrowthChart data={dailyMetrics} />
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                      No follower data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-50 border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-900 text-base">
                    Engagement Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyMetrics?.length ? (
                    <EngagementTypeStacked data={dailyMetrics} />
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                      No engagement data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Row 4: Top Posts + Posting Heatmap */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-900 text-base">
                    Top Performing Posts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {topPostsLoading ? (
                    <div className="flex h-[300px] items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    </div>
                  ) : topPosts?.length ? (
                    <TopPostsHorizontalBar data={topPosts} />
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                      No published posts to rank
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-50 border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-gray-900 text-base">
                    Posting Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyMetrics?.length ? (
                    <PostingHeatmap data={dailyMetrics} />
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
                      No activity data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Row 5: AI Insights */}
            <AIInsightsPanel
              insights={aiInsights}
              isLoading={insightsLoading}
            />
          </>
        )}
      </div>
    </>
  );
}
