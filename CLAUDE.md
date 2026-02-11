# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Social media management platform ("Socially") with AI-powered content generation, multi-platform scheduling (TikTok, Instagram), and analytics. Monorepo with separate frontend, backend, shared types, and Firebase config directories.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix UI)
- **Backend**: Fastify 5, TypeScript (ESM), tsx for dev
- **Database/Auth/Storage**: Firebase (Firestore, Auth, Storage) — client SDK on frontend, Admin SDK on backend
- **AI**: OpenAI GPT-4
- **State**: Context API (auth, org), local useState per page. Zustand and React Query are installed but not actively used yet.

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev          # Next.js dev server on :3000
npm run build        # Production build
npm run lint         # ESLint
```

### Backend (`cd backend`)
```bash
npm run dev          # tsx watch on :3001
npm run build        # tsc compile
npm run start        # Run compiled dist/index.js
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint src/**/*.ts
```

### Firebase (`cd firebase`)
```bash
firebase deploy --only firestore:rules,storage:rules
firebase emulators:start    # Auth :9099, Firestore :8080, Storage :9199, UI :4000
```

Both frontend and backend use `@/*` path aliases mapped to `src/*`.

## Architecture

### Backend (Fastify)

Entry point: `backend/src/index.ts` — registers CORS, multipart (100MB), cookies, error handler, then mounts routes:

- `/auth` — get/update user profile (auto-creates user doc on first `/me` call)
- `/organizations` — CRUD with owner/member access checks
- `/organizations/:orgId/accounts` — OAuth connect/callback/disconnect for TikTok and Instagram
- `/organizations/:orgId/posts` — CRUD + publish/schedule endpoints
- `/organizations/:orgId/media` — upload (images/videos to Firebase Storage) and delete
- `/ai` — generate hooks, captions, ideas, scripts via OpenAI

**Middleware**: `authenticate()` verifies Firebase ID token → sets `request.user`. `requireOrgMembership()` checks org owner/member access. Both in `middleware/auth.ts`.

**Services layer** (`services/`):
- `firebase.ts` — singleton init, exports `db` helper with collection/doc references for users, organizations, socialAccounts (subcollection), posts (subcollection), scheduledJobs
- `publisher.ts` — orchestrates cross-platform publishing per post, updates per-platform status
- `tiktok.ts` / `instagram.ts` — OAuth flows + publishing APIs
- `openai.ts` — GPT-4 generation + content analysis + hashtag generation

**Jobs** (`jobs/scheduler.ts`): Two cron jobs — process pending scheduled posts every minute, refresh expiring tokens every hour.

### Frontend (Next.js App Router)

Route groups:
- `(auth)/` — login, register, forgot-password (public, centered layout)
- `(dashboard)/` — protected layout with sidebar; redirects to `/login` if unauthenticated

Dashboard pages: `/dashboard`, `/dashboard/posts`, `/dashboard/posts/new`, `/dashboard/accounts`, `/dashboard/calendar`, `/dashboard/ai`, `/dashboard/analytics`, `/dashboard/settings`, `/dashboard/inbox` (coming soon)

**Key files**:
- `lib/api.ts` — Axios singleton (`ApiClient`) with request interceptor that attaches Firebase ID token as Bearer. 401 responses redirect to `/login`. Centralized `endpoints` object for all API routes.
- `lib/firebase.ts` — Firebase client init; connects to emulators when `NEXT_PUBLIC_USE_EMULATORS=true`
- `lib/hooks/use-auth.tsx` — AuthContext wrapping Firebase `onAuthStateChanged`, provides signIn/signUp/signOut/Google OAuth
- `lib/hooks/use-organization.tsx` — OrgContext fetching from API, persists selected org to localStorage
- `components/providers.tsx` — Provider hierarchy: QueryClient → Auth → Organization → children + Toaster

**UI**: Dark theme (slate-900 bg), blue-to-purple gradients for CTAs. shadcn/ui components in `components/ui/`. Dashboard layout components in `components/dashboard/`.

### Shared Types

`shared/types/index.ts` contains canonical type definitions. However, frontend and backend each maintain their own `types/index.ts` with layer-specific variations:
- Backend types use Firestore `Timestamp` and include sensitive fields (accessToken, refreshToken, tokenExpiresAt, ScheduledJob)
- Frontend types use `Date` objects and exclude token fields

### Firestore Data Model

```
/users/{userId}
/organizations/{orgId}
  /socialAccounts/{accountId}    # Subcollection — tokens only writable via API
  /posts/{postId}                # Subcollection
/scheduledJobs/{jobId}           # Top-level, backend-only access
```

### Post Lifecycle

draft → scheduled (creates ScheduledJob) → publishing → published/failed. Each post tracks per-platform status in `platforms[]` array with individual `PostPlatform` entries.

### OAuth Flow (TikTok/Instagram)

`/accounts/connect/:platform` generates OAuth URL with encoded state (orgId + userId) → user authorizes on platform → callback at `/accounts/callback/:platform` exchanges code for tokens → stores/updates SocialAccount in Firestore → redirects to frontend.
