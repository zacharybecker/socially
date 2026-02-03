# Social Media Manager

An all-in-one social media management platform with AI-powered content generation, multi-platform scheduling, and analytics.

## Tech Stack

- **Frontend**: Next.js 14+ with TypeScript, Tailwind CSS, shadcn/ui (deployed on Vercel)
- **Backend**: Fastify with TypeScript (deployed on Amazon Lightsail)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **File Storage**: Firebase Storage
- **AI**: OpenAI GPT-4

## Project Structure

```
social-media-manager/
├── frontend/          # Next.js app (Vercel)
├── backend/           # Fastify API (Lightsail)
├── firebase/          # Firebase configuration and rules
└── shared/            # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project
- TikTok Developer Account
- Instagram/Facebook Developer Account
- OpenAI API key

### 1. Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password and Google)
3. Create a Firestore database
4. Enable Firebase Storage
5. Generate a service account key for the backend

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your Firebase config
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev
```

The backend API will be available at `http://localhost:3001`

### 4. Deploy Firebase Rules

```bash
cd firebase
firebase deploy --only firestore:rules,storage:rules
```

## Environment Variables

### Frontend (.env.local)

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (.env)

```
PORT=3001
FRONTEND_URL=http://localhost:3000
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
OPENAI_API_KEY=
```

## Features

### MVP (Phase 1)
- User authentication (email + Google)
- Connect TikTok and Instagram accounts
- Create and schedule posts
- Media upload and management
- Post queue and history
- Dashboard overview

### Planned Features
- AI content generation (hooks, captions, scripts)
- Analytics and insights
- Content calendar
- Unified inbox
- Team collaboration
- Additional platforms (YouTube, Twitter, Facebook, LinkedIn)
- Billing and subscriptions

## API Endpoints

### Authentication
- `GET /auth/me` - Get current user
- `PUT /auth/profile` - Update profile

### Organizations
- `GET /organizations` - List organizations
- `POST /organizations` - Create organization
- `GET /organizations/:id` - Get organization
- `PUT /organizations/:id` - Update organization
- `DELETE /organizations/:id` - Delete organization

### Social Accounts
- `GET /organizations/:orgId/accounts` - List accounts
- `GET /organizations/:orgId/accounts/connect/:platform` - Get OAuth URL
- `DELETE /organizations/:orgId/accounts/:accountId` - Disconnect account

### Posts
- `GET /organizations/:orgId/posts` - List posts
- `POST /organizations/:orgId/posts` - Create post
- `GET /organizations/:orgId/posts/:postId` - Get post
- `PUT /organizations/:orgId/posts/:postId` - Update post
- `DELETE /organizations/:orgId/posts/:postId` - Delete post
- `POST /organizations/:orgId/posts/:postId/publish` - Publish now
- `POST /organizations/:orgId/posts/:postId/schedule` - Schedule post

### Media
- `POST /organizations/:orgId/media/upload` - Upload media
- `DELETE /organizations/:orgId/media/:mediaId` - Delete media

### AI
- `POST /ai/generate-hook` - Generate hooks
- `POST /ai/generate-caption` - Generate captions
- `POST /ai/generate-ideas` - Generate content ideas
- `POST /ai/generate-script` - Generate video script

## License

MIT
