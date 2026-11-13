# ==============================================================================
# Production Dockerfile for Campus Placement Hub (Next.js 16)
# Multi-stage optimized build using Node 20 Alpine and Bun
# ==============================================================================

FROM oven/bun:1.2-alpine AS deps
WORKDIR /app

# Install build prerequisites for native packages
RUN apk add --no-cache libc6-compat

COPY package.json bun.lock ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile
RUN bunx prisma generate

# ------------------------------------------------------------------------------
# Build stage
# ------------------------------------------------------------------------------
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Set dummy build variables for Next.js static asset compilation
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL="postgresql://postgres:postgres@localhost:5432/placement_vault"

RUN bun run build

# ------------------------------------------------------------------------------
# Production Runner stage (Lightweight Alpine image)
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built application output
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]

