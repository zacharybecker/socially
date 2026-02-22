// Shared types between frontend and backend

// User types
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  planTier: PlanTier;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
  createdAt: Date;
}

export type PlanTier = "free" | "creator" | "business" | "agency";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

// Plan limits
export interface PlanLimits {
  socialAccounts: number;
  postsPerMonth: number;
  aiCreditsPerMonth: number;
  imageGenerations: number;
  videoGenerations: number;
  teamMembers: number;
  storageMB: number;
  analyticsRetentionDays: number;
  brandVoice: boolean;
  contentApproval: boolean;
  apiAccess: boolean;
}

// Organization types
export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  members: OrganizationMember[];
  createdAt: Date;
}

export interface OrganizationMember {
  userId: string;
  role: OrgRole;
  joinedAt: Date;
}

export type OrgRole = "admin" | "editor" | "viewer";

// Platform types
export type Platform =
  | "tiktok"
  | "instagram"
  | "youtube"
  | "twitter"
  | "facebook"
  | "linkedin"
  | "threads"
  | "pinterest";

// Social Account types
export interface SocialAccount {
  id: string;
  platform: Platform;
  platformUserId: string;
  username: string;
  profileImage: string | null;
  connectedAt: Date;
  lastSyncAt: Date | null;
}

// Post types
export type PostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "pending_approval"
  | "approved"
  | "rejected";

export interface Post {
  id: string;
  organizationId: string;
  status: PostStatus;
  content: string;
  mediaUrls: string[];
  scheduledAt: Date | null;
  publishedAt: Date | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  platforms: PostPlatform[];
  approvalRequest?: ApprovalRequest | null;
}

export interface PostPlatform {
  accountId: string;
  status: PostStatus;
  platformPostId: string | null;
  errorMessage: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ApprovalRequest {
  requestedBy: string;
  requestedAt: Date;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  status: "pending" | "approved" | "rejected";
  comment?: string | null;
}

// Input types
export interface CreatePostInput {
  content: string;
  mediaUrls?: string[];
  scheduledAt?: string | null;
  accountIds: string[];
}

export interface UpdatePostInput {
  content?: string;
  mediaUrls?: string[];
  scheduledAt?: string | null;
  accountIds?: string[];
}

// AI types
export interface GenerateHookInput {
  topic: string;
  niche?: string;
  tone?: "professional" | "casual" | "humorous" | "dramatic";
  count?: number;
}

export interface GenerateCaptionInput {
  topic: string;
  platform: Platform;
  tone?: "professional" | "casual" | "humorous";
  includeHashtags?: boolean;
  maxLength?: number;
}

export interface GenerateIdeasInput {
  niche: string;
  count?: number;
  contentType?: "educational" | "entertaining" | "promotional" | "behind-the-scenes";
}

export interface GenerateScriptInput {
  topic: string;
  duration?: "15s" | "30s" | "60s" | "90s";
  style?: "storytelling" | "listicle" | "tutorial" | "reaction";
}

export interface RefineContentInput {
  content: string;
  action: "rewrite" | "shorten" | "expand" | "change_tone";
  tone?: "professional" | "casual" | "humorous" | "dramatic" | "inspirational";
  platform?: Platform;
  useBrandVoice?: boolean;
}

export interface GenerateHashtagsInput {
  content: string;
  platform: Platform;
  count?: number;
}

export interface GenerateImageInput {
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  style?: "vivid" | "natural";
  quality?: "standard" | "hd";
}

export interface CaptionVariation {
  caption: string;
  tone: string;
  hashtags?: string[];
}

// Analytics types
export interface AnalyticsOverview {
  totalImpressions: number;
  totalReach: number;
  totalEngagements: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalVideoViews: number;
  totalFollowers: number;
  followerChange: number;
  engagementRate: number;
  postsPublished: number;
  period: {
    start: Date;
    end: Date;
  };
}

export type AnalyticsDateRange = "7d" | "14d" | "30d" | "90d" | "365d" | "custom";

export interface DailyMetrics {
  date: string;
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  videoViews: number;
  followers: number;
  followerChange: number;
  engagementRate: number;
  postsPublished: number;
  platformBreakdown: Record<Platform, PlatformBreakdown>;
}

export interface PlatformBreakdown {
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  videoViews: number;
  followers: number;
  followerChange: number;
}

export interface TopPost {
  postId: string;
  content: string;
  platform: Platform;
  publishedAt: Date;
  impressions: number;
  engagements: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface AudienceDemographics {
  ageGroups: { group: string; percentage: number }[];
  genderSplit: { gender: string; percentage: number }[];
  topCountries: { country: string; percentage: number }[];
  topCities: { city: string; percentage: number }[];
}

export interface PostAnalytics {
  postId: string;
  impressions: number;
  reach: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  videoViews: number;
  engagementRate: number;
  snapshotAt: Date;
}

export interface AIInsight {
  type: "trend" | "recommendation" | "alert" | "prediction";
  title: string;
  description: string;
  confidence: number;
  data?: Record<string, unknown>;
}

// Brand Voice
export interface BrandVoice {
  guidelines: string;
  tone: string;
  keyPhrases: string[];
  avoidPhrases: string[];
  sampleContent: string[];
}

// AI Suggestions
export interface AISuggestion {
  id: string;
  type: "posting_time" | "content_idea" | "trending_topic" | "optimization";
  title: string;
  description: string;
  status: "active" | "dismissed" | "applied";
  data?: Record<string, unknown>;
  createdAt: Date;
}

// Team / Invitation
export interface Invitation {
  id: string;
  email: string;
  role: OrgRole;
  invitedBy: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

// Activity Log
export interface ActivityLogEntry {
  id: string;
  userId: string;
  userDisplayName?: string;
  action: string;
  resourceType: "post" | "account" | "organization" | "member" | "settings" | "billing";
  resourceId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Comments
export interface Comment {
  id: string;
  userId: string;
  userDisplayName: string;
  content: string;
  createdAt: Date;
}

// Video Generation
export interface VideoJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  prompt: string;
  aspectRatio?: string;
  resultUrl?: string | null;
  errorMessage?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
}

// Usage tracking
export interface UsagePeriod {
  postsCreated: number;
  aiCreditsUsed: number;
  imageGenerationsUsed: number;
  videoGenerationsUsed: number;
  storageMBUsed: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
