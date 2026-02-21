# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Social media management platform ("Socially") with AI-powered content generation, multi-platform scheduling (TikTok, Instagram, YouTube, Twitter/X, Facebook, LinkedIn, Threads, Pinterest), analytics, team collaboration, and billing. Monorepo using pnpm workspaces with separate frontend, backend, shared types, and Firebase config directories.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix UI)
- **Backend**: Fastify 5, TypeScript (ESM), tsx for dev
- **Database/Auth/Storage**: Firebase (Firestore, Auth, Storage) — client SDK on frontend, Admin SDK on backend
- **AI**: OpenAI GPT-4
- **Billing**: Stripe (checkout, customer portal, webhooks, subscription management)
- **Email**: Resend (invitations, approval notifications)
- **Exports**: pdfkit (PDF), exceljs (XLSX), custom CSV generator
- **Testing**: Vitest
- **State**: Context API (auth, org), React Query (analytics), local useState per page. Zustand is installed but not actively used.
- **CI/CD**: GitHub Actions — CI (typecheck, lint, test, build) + deploy (Vercel frontend, Cloud Run backend, Firebase rules)

## Commands

### Root (pnpm workspaces)
```bash
pnpm dev             # Run frontend + backend in parallel
pnpm dev:frontend    # Frontend only
pnpm dev:backend     # Backend only
pnpm build           # Build all packages
pnpm lint            # Lint all packages
pnpm test            # Test all packages
pnpm typecheck       # Typecheck all packages
```

### Frontend (`cd frontend`)
```bash
pnpm dev             # Next.js dev server on :3000
pnpm build           # Production build
pnpm lint            # ESLint
pnpm test            # Vitest
```

### Backend (`cd backend`)
```bash
pnpm dev             # tsx watch on :3001
pnpm build           # tsc compile
pnpm start           # Run compiled dist/index.js
pnpm typecheck       # tsc --noEmit
pnpm lint            # ESLint src/**/*.ts
pnpm test            # Vitest
```

### Firebase (`cd firebase`)
```bash
firebase deploy --only firestore:rules,storage:rules
firebase emulators:start    # Auth :9099, Firestore :8080, Storage :9199, UI :4000
```

Both frontend and backend use `@/*` path aliases mapped to `src/*`.

## Architecture

### Backend (Fastify)

Entry point: `backend/src/index.ts` — registers Helmet, CORS, rate-limit (100/min global), multipart (100MB), cookies, error handler, then mounts routes:

- `/auth` — get/update user profile (auto-creates user doc on first `/me` call); rate-limited 30/min
- `/organizations` — CRUD with owner/member access checks
- `/organizations/:orgId/accounts` — OAuth connect/callback/disconnect for all 8 platforms
- `/organizations/:orgId/posts` — CRUD + publish/schedule + approval workflow (submit/approve/reject)
- `/organizations/:orgId/media` — upload (images/videos to Firebase Storage) and delete; rate-limited 20/min
- `/organizations/:orgId/analytics` — overview, daily, accounts, posts, top posts, demographics, sync, AI insights
- `/organizations/:orgId/brand-voice` — get/update/analyze brand voice settings
- `/organizations/:orgId/ai` — AI-powered suggestions (list/dismiss/apply/schedule)
- `/organizations/:orgId/exports` — CSV, XLSX, PDF export for analytics, posts, accounts
- `/organizations/:orgId/members` — invite, remove, change role, manage invitations
- `/organizations/:orgId/posts/:postId/comments` — internal team comments on posts
- `/organizations/:orgId/activity` — activity log / audit trail
- `/ai` — generate hooks, captions, ideas, scripts, hashtags, content analysis, refinement, caption variations, image/video generation; rate-limited 10/min
- `/billing` — Stripe checkout, customer portal, subscription info, usage
- `/webhooks` — Stripe webhook handler (raw body parsing)
- `/health` — health check

**Middleware** (`middleware/`):
- `auth.ts` — `authenticate()` verifies Firebase ID token → sets `request.user`. `optionalAuth()` for optional auth. `requireOrgMembership()` checks org owner/member access. `requireRole(...roles)` for role-based access control.
- `planGuard.ts` — `requireFeature(feature)` checks plan-tier feature access. `requireQuota(metric)` checks usage limits.

**Services layer** (`services/`):
- `firebase.ts` — singleton init, exports `db` helper with collection/doc references for all Firestore paths
- `publisher.ts` — orchestrates cross-platform publishing per post, updates per-platform status
- `tiktok.ts` / `instagram.ts` / `youtube.ts` / `twitter.ts` / `facebook.ts` / `linkedin.ts` / `threads.ts` / `pinterest.ts` — OAuth flows + publishing APIs per platform
- `openai.ts` — GPT-4 generation + content analysis + hashtag generation
- `analyticsService.ts` — pulls platform metrics, aggregates daily/monthly analytics
- `stripe.ts` — checkout, customer portal, subscription management
- `email.ts` — Resend-based email (invitations, approval requests)
- `usage.ts` — usage tracking per user per month, quota checking, monthly reset
- `activity-log.ts` — writes activity log entries
- `ai-suggestions.ts` — generates AI-powered suggestions for orgs
- `video-generation.ts` — async video job management
- `csvGenerator.ts` / `excelGenerator.ts` / `pdfGenerator.ts` — export generators

**Config** (`config/`):
- `plans.ts` — defines 4 billing tiers (free, creator, business, agency) with pricing, Stripe price IDs, and plan limits

**Jobs** (`jobs/`): Five cron jobs:
- Every minute — process pending scheduled posts
- Every hour — refresh expiring tokens (all 8 platforms)
- Every 6 hours — sync analytics (`analyticsSyncer.ts`)
- 1st of each month — reset monthly usage counters
- Daily at 6am — generate AI suggestions for all orgs

### Frontend (Next.js App Router)

Route groups:
- `(auth)/` — login, register, forgot-password, invite (public, centered layout)
- `(dashboard)/` — protected layout with sidebar; redirects to `/login` if unauthenticated

Dashboard pages: `/dashboard`, `/dashboard/posts`, `/dashboard/posts/new`, `/dashboard/accounts`, `/dashboard/calendar`, `/dashboard/ai`, `/dashboard/analytics`, `/dashboard/settings`, `/dashboard/inbox`

**Key files**:
- `lib/api.ts` — Axios singleton (`ApiClient`) with request interceptor that attaches Firebase ID token as Bearer. 401 responses redirect to `/login`. Centralized `endpoints` object covering auth, organizations, accounts, posts, media, ai, analytics, billing, brandVoice, aiSuggestions, exports, members, comments, activity, and approval.
- `lib/firebase.ts` — Firebase client init; connects to emulators when `NEXT_PUBLIC_USE_EMULATORS=true`
- `lib/hooks/use-auth.tsx` — AuthContext wrapping Firebase `onAuthStateChanged`, provides signIn/signUp/signOut/Google OAuth/refreshProfile/updateUserProfile
- `lib/hooks/use-organization.tsx` — OrgContext fetching from API, persists selected org to localStorage
- `lib/hooks/use-analytics.ts` — React Query hooks for analytics (overview, daily metrics, top posts, account analytics, post analytics, AI insights)
- `components/providers.tsx` — Provider hierarchy: QueryClient → Auth → Organization → children + Toaster

**Component directories**:
- `components/ui/` — shadcn/ui primitives
- `components/dashboard/` — sidebar, header, notification dropdown
- `components/ai/` — brand voice settings, caption variations, content refiner, image/video generators
- `components/analytics/` — charts, date-range-picker, export dropdown, AI insights panel, stats cards, heatmap, sparklines
- `components/billing/` — plan comparison, trial banner, upgrade dialog/prompt, usage meter

**UI**: Dark theme (slate-900 bg), blue-to-purple gradients for CTAs.

### Shared Types

`shared/types/index.ts` contains canonical type definitions including:
- `Platform` — 8 platforms (tiktok, instagram, youtube, twitter, facebook, linkedin, threads, pinterest)
- `PlanTier` — free, creator, business, agency
- `OrgRole` — admin, editor, viewer
- `PostStatus` — includes pending_approval, approved, rejected for content approval workflow
- Analytics types: `AnalyticsOverview`, `DailyMetrics`, `TopPost`, `AudienceDemographics`, `PostAnalytics`, `AIInsight`
- `BrandVoice`, `AISuggestion`, `Invitation`, `ActivityLogEntry`, `Comment`, `VideoJob`, `UsagePeriod`
- `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>` — standardized API response types

Frontend and backend each maintain their own `types/index.ts` with layer-specific variations:
- Backend types use Firestore `Timestamp` and include sensitive fields (accessToken, refreshToken, tokenExpiresAt, ScheduledJob)
- Frontend types use `Date` objects and exclude token fields

### Firestore Data Model

```
/users/{userId}
  /usage/{periodId}                    # Monthly usage counters

/organizations/{orgId}
  /socialAccounts/{accountId}
    /accountAnalytics/{date}           # Per-account daily analytics
  /posts/{postId}
    /postAnalytics/{snapshotId}        # Post-level analytics snapshots
    /comments/{commentId}              # Internal team comments
  /analyticsDaily/{date}              # Org-level daily metrics
  /analyticsMonthly/{month}           # Org-level monthly metrics
  /aiSuggestions/{suggestionId}        # AI-generated suggestions
  /videoJobs/{jobId}                   # Async video generation jobs
  /invitations/{invitationId}          # Team invitations
  /activityLog/{logId}                 # Audit trail
  /settings/brandVoice                 # Single doc for brand voice config

/scheduledJobs/{jobId}                 # Top-level, backend-only
```

Collection group query on `socialAccounts` used for token refresh across all orgs.

### Post Lifecycle

draft → scheduled (creates ScheduledJob) → publishing → published/failed. Posts may also go through an approval workflow: draft → pending_approval → approved/rejected → scheduled → publishing → published/failed. Each post tracks per-platform status in `platforms[]` array with individual `PostPlatform` entries.

### OAuth Flow

`/accounts/connect/:platform` generates OAuth URL with encoded state (orgId + userId) → user authorizes on platform → callback at `/accounts/callback/:platform` exchanges code for tokens → stores/updates SocialAccount in Firestore → redirects to frontend. Supports all 8 platforms.

### Billing

4-tier plan system (free → creator → business → agency) managed via Stripe. `config/plans.ts` defines limits per tier. `planGuard.ts` middleware enforces feature gates and usage quotas. Stripe webhooks handle subscription lifecycle events.
