import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { auth } from "./firebase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use(async (config) => {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle response errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export const api = new ApiClient();

// API endpoints
export const endpoints = {
  // Auth
  auth: {
    me: "/auth/me",
    updateProfile: "/auth/profile",
  },
  // Organizations
  organizations: {
    list: "/organizations",
    create: "/organizations",
    get: (id: string) => `/organizations/${id}`,
    update: (id: string) => `/organizations/${id}`,
    delete: (id: string) => `/organizations/${id}`,
    members: (id: string) => `/organizations/${id}/members`,
  },
  // Social Accounts
  accounts: {
    list: (orgId: string) => `/organizations/${orgId}/accounts`,
    connect: (orgId: string, platform: string) => `/organizations/${orgId}/accounts/connect/${platform}`,
    callback: (orgId: string, platform: string) => `/organizations/${orgId}/accounts/callback/${platform}`,
    disconnect: (orgId: string, accountId: string) => `/organizations/${orgId}/accounts/${accountId}`,
    refresh: (orgId: string, accountId: string) => `/organizations/${orgId}/accounts/${accountId}/refresh`,
  },
  // Posts
  posts: {
    list: (orgId: string) => `/organizations/${orgId}/posts`,
    create: (orgId: string) => `/organizations/${orgId}/posts`,
    get: (orgId: string, postId: string) => `/organizations/${orgId}/posts/${postId}`,
    update: (orgId: string, postId: string) => `/organizations/${orgId}/posts/${postId}`,
    delete: (orgId: string, postId: string) => `/organizations/${orgId}/posts/${postId}`,
    publish: (orgId: string, postId: string) => `/organizations/${orgId}/posts/${postId}/publish`,
    schedule: (orgId: string, postId: string) => `/organizations/${orgId}/posts/${postId}/schedule`,
  },
  // Media
  media: {
    upload: (orgId: string) => `/organizations/${orgId}/media/upload`,
    delete: (orgId: string, mediaId: string) => `/organizations/${orgId}/media/${mediaId}`,
  },
  // AI
  ai: {
    generateHook: "/ai/generate-hook",
    generateCaption: "/ai/generate-caption",
    generateIdeas: "/ai/generate-ideas",
    generateScript: "/ai/generate-script",
    generateHashtags: "/ai/generate-hashtags",
    analyzeContent: "/ai/analyze-content",
    refineContent: "/ai/refine-content",
    generateCaptionVariations: "/ai/generate-caption-variations",
    generateImage: "/ai/generate-image",
    generateVideo: "/ai/generate-video",
    videoJob: (jobId: string) => `/ai/video-jobs/${jobId}`,
    videoJobs: "/ai/video-jobs",
  },
  // Analytics
  analytics: {
    overview: (orgId: string) => `/organizations/${orgId}/analytics/overview`,
    daily: (orgId: string) => `/organizations/${orgId}/analytics/daily`,
    accounts: (orgId: string, accountId: string) => `/organizations/${orgId}/analytics/accounts/${accountId}`,
    posts: (orgId: string, postId: string) => `/organizations/${orgId}/analytics/posts/${postId}`,
    topPosts: (orgId: string) => `/organizations/${orgId}/analytics/top-posts`,
    demographics: (orgId: string) => `/organizations/${orgId}/analytics/demographics`,
    sync: (orgId: string) => `/organizations/${orgId}/analytics/sync`,
    aiInsights: (orgId: string) => `/organizations/${orgId}/analytics/ai-insights`,
  },
  // Billing
  billing: {
    createCheckout: "/billing/create-checkout",
    customerPortal: "/billing/customer-portal",
    subscription: "/billing/subscription",
    usage: "/billing/usage",
  },
  // Brand Voice
  brandVoice: {
    get: (orgId: string) => `/organizations/${orgId}/brand-voice`,
    update: (orgId: string) => `/organizations/${orgId}/brand-voice`,
    analyze: (orgId: string) => `/organizations/${orgId}/brand-voice/analyze`,
  },
  // AI Suggestions
  aiSuggestions: {
    list: (orgId: string) => `/organizations/${orgId}/ai-suggestions`,
    dismiss: (orgId: string, id: string) => `/organizations/${orgId}/ai-suggestions/${id}/dismiss`,
    apply: (orgId: string, id: string) => `/organizations/${orgId}/ai-suggestions/${id}/apply`,
    suggestSchedule: (orgId: string) => `/organizations/${orgId}/ai-suggestions/suggest-schedule`,
  },
  // Exports
  exports: {
    analyticsCSV: (orgId: string) => `/organizations/${orgId}/exports/analytics/csv`,
    analyticsXLSX: (orgId: string) => `/organizations/${orgId}/exports/analytics/xlsx`,
    reportPDF: (orgId: string) => `/organizations/${orgId}/exports/report/pdf`,
    postsCSV: (orgId: string) => `/organizations/${orgId}/exports/posts/csv`,
    accountCSV: (orgId: string, accountId: string) => `/organizations/${orgId}/exports/accounts/${accountId}/csv`,
  },
  // Members
  members: {
    list: (orgId: string) => `/organizations/${orgId}/members`,
    invite: (orgId: string) => `/organizations/${orgId}/members/invite`,
    remove: (orgId: string, userId: string) => `/organizations/${orgId}/members/${userId}`,
    changeRole: (orgId: string, userId: string) => `/organizations/${orgId}/members/${userId}/role`,
    invitations: (orgId: string) => `/organizations/${orgId}/members/invitations`,
    revokeInvitation: (orgId: string, invitationId: string) => `/organizations/${orgId}/members/invitations/${invitationId}`,
    acceptInvitation: (orgId: string, token: string) => `/organizations/${orgId}/members/invitations/${token}/accept`,
  },
  // Comments
  comments: {
    list: (orgId: string, postId: string) => `/organizations/${orgId}/posts/${postId}/comments`,
    create: (orgId: string, postId: string) => `/organizations/${orgId}/posts/${postId}/comments`,
    delete: (orgId: string, postId: string, commentId: string) => `/organizations/${orgId}/posts/${postId}/comments/${commentId}`,
  },
  // Activity
  activity: {
    list: (orgId: string) => `/organizations/${orgId}/activity`,
  },
  // Post Approval
  approval: {
    submit: (orgId: string, postId: string) => `/organizations/${orgId}/posts/${postId}/submit-for-approval`,
    approve: (orgId: string, postId: string) => `/organizations/${orgId}/posts/${postId}/approve`,
    reject: (orgId: string, postId: string) => `/organizations/${orgId}/posts/${postId}/reject`,
  },
};
