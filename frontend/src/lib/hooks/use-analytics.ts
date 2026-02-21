"use client";

import { useQuery } from "@tanstack/react-query";
import { api, endpoints } from "@/lib/api";
import type {
  AnalyticsOverview,
  DailyMetrics,
  TopPost,
  PostAnalytics,
  AIInsight,
} from "@/types";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

const queryDefaults = {
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const;

export function useAnalyticsOverview(
  orgId: string | undefined,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ["analytics", "overview", orgId, startDate, endDate],
    queryFn: () =>
      api.get<ApiResponse<AnalyticsOverview>>(endpoints.analytics.overview(orgId!), {
        params: { startDate, endDate },
      }),
    enabled: !!orgId,
    ...queryDefaults,
    select: (res) => res.data,
  });
}

export function useDailyMetrics(
  orgId: string | undefined,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ["analytics", "daily", orgId, startDate, endDate],
    queryFn: () =>
      api.get<ApiResponse<DailyMetrics[]>>(endpoints.analytics.daily(orgId!), {
        params: { startDate, endDate },
      }),
    enabled: !!orgId,
    ...queryDefaults,
    select: (res) => res.data,
  });
}

export function useTopPosts(
  orgId: string | undefined,
  startDate: string,
  endDate: string,
  limit?: number,
  sortBy?: string
) {
  return useQuery({
    queryKey: ["analytics", "topPosts", orgId, startDate, endDate, limit, sortBy],
    queryFn: () =>
      api.get<ApiResponse<TopPost[]>>(endpoints.analytics.topPosts(orgId!), {
        params: { startDate, endDate, limit, sortBy },
      }),
    enabled: !!orgId,
    ...queryDefaults,
    select: (res) => res.data,
  });
}

export function useAccountAnalytics(
  orgId: string | undefined,
  accountId: string,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ["analytics", "account", orgId, accountId, startDate, endDate],
    queryFn: () =>
      api.get<ApiResponse<DailyMetrics[]>>(
        endpoints.analytics.accounts(orgId!, accountId),
        { params: { startDate, endDate } }
      ),
    enabled: !!orgId && !!accountId,
    ...queryDefaults,
    select: (res) => res.data,
  });
}

export function usePostAnalytics(
  orgId: string | undefined,
  postId: string
) {
  return useQuery({
    queryKey: ["analytics", "post", orgId, postId],
    queryFn: () =>
      api.get<ApiResponse<PostAnalytics>>(
        endpoints.analytics.posts(orgId!, postId)
      ),
    enabled: !!orgId && !!postId,
    ...queryDefaults,
    select: (res) => res.data,
  });
}

export function useAIInsights(
  orgId: string | undefined,
  startDate: string,
  endDate: string
) {
  return useQuery({
    queryKey: ["analytics", "aiInsights", orgId, startDate, endDate],
    queryFn: () =>
      api.get<ApiResponse<AIInsight[]>>(endpoints.analytics.aiInsights(orgId!), {
        params: { startDate, endDate },
      }),
    enabled: !!orgId,
    ...queryDefaults,
    select: (res) => res.data,
  });
}
