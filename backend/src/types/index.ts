import { Timestamp } from "firebase-admin/firestore";

// User types
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  planTier: PlanTier;
  createdAt: Timestamp;
}

export type PlanTier = "free" | "creator" | "business" | "agency";

// Organization types
export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  members: OrganizationMember[];
  createdAt: Timestamp;
}

export interface OrganizationMember {
  userId: string;
  role: "admin" | "editor" | "viewer";
  joinedAt: Timestamp;
}

// Social Account types
export type Platform = "tiktok" | "instagram" | "youtube" | "twitter" | "facebook" | "linkedin" | "threads";

export interface SocialAccount {
  id: string;
  platform: Platform;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Timestamp | null;
  platformUserId: string;
  username: string;
  profileImage: string | null;
  connectedAt: Timestamp;
  lastSyncAt: Timestamp | null;
}

export interface SocialAccountResponse {
  id: string;
  platform: Platform;
  platformUserId: string;
  username: string;
  profileImage: string | null;
  connectedAt: Date;
  lastSyncAt: Date | null;
}

// Post types
export type PostStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";

export interface Post {
  id: string;
  organizationId: string;
  status: PostStatus;
  content: string;
  mediaUrls: string[];
  scheduledAt: Timestamp | null;
  publishedAt: Timestamp | null;
  createdByUserId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  platforms: PostPlatform[];
}

export interface PostPlatform {
  accountId: string;
  status: PostStatus;
  platformPostId: string | null;
  errorMessage: string | null;
}

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

// Scheduled Job types
export interface ScheduledJob {
  id: string;
  postId: string;
  orgId: string;
  scheduledAt: Timestamp;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Timestamp;
  processedAt: Timestamp | null;
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

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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
