// User types
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  planTier: PlanTier;
  createdAt: Date;
}

export type PlanTier = "free" | "creator" | "business" | "agency";

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
  role: "admin" | "editor" | "viewer";
  joinedAt: Date;
}

// Social Account types
export type Platform = "tiktok" | "instagram" | "youtube" | "twitter" | "facebook" | "linkedin" | "threads";

export interface SocialAccount {
  id: string;
  platform: Platform;
  platformUserId: string;
  username: string;
  profileImage: string | null;
  connectedAt: Date;
  lastSyncAt: Date | null;
  // Token info is not exposed to frontend
}

// Post types
export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";

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
}

export interface PostPlatform {
  accountId: string;
  status: PostStatus;
  platformPostId: string | null;
  errorMessage: string | null;
}

// Create/Update DTOs
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

// Media types
export interface MediaFile {
  id: string;
  url: string;
  type: "image" | "video";
  filename: string;
  size: number;
  createdAt: Date;
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

// Analytics types
export interface AnalyticsOverview {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  engagementRate: number;
  followerGrowth: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface PostAnalytics {
  postId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagementRate: number;
  reachRate: number;
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
