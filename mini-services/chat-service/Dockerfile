# ==============================================================================
# Production Dockerfile for Campus Placement Hub Chat Service (Socket.IO + Bun)
# ==============================================================================

FROM oven/bun:1.2-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY index.ts ./

ENV NODE_ENV=production
ENV CHAT_PORT=3004

EXPOSE 3004

CMD ["bun", "index.ts"]
