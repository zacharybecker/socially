FROM node:20-slim AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace root files for pnpm
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/package.json

# Install dependencies
RUN pnpm install --frozen-lockfile --filter backend

# Copy backend source
COPY backend/ backend/

# Build
RUN pnpm --filter backend run build

# --- Runtime stage ---
FROM node:20-slim

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY backend/package.json backend/package.json

# Install production dependencies only
RUN pnpm install --frozen-lockfile --filter backend --prod

# Copy compiled output from builder
COPY --from=builder /app/backend/dist backend/dist

WORKDIR /app/backend

EXPOSE 3001

CMD ["node", "dist/index.js"]
