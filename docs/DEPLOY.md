# Campus Placement Hub — Production Deployment & Operations Guide

This guide describes the complete architecture, host choices, environment configuration, database management, and operational runbooks for running **Campus Placement Hub** in production.

---

## 1. System Architecture

```mermaid
flowchart TD
    Client["Student Browsers (Mobile & Desktop)"]
    
    subgraph Edge ["CDN & Ingress Layer"]
        VercelEdge["Vercel Edge / Cloudflare CDN"]
        ChatProxy["Caddy / Cloudflare WebSocket Proxy"]
    end

    subgraph Compute ["Compute Services"]
        WebApp["Next.js 16 Web App<br/>(Vercel or Docker on Render/Fly.io)"]
        ChatSvc["Chat Microservice (Port 3004)<br/>(Bun + Socket.IO on Fly.io / VPS)"]
    end

    subgraph Data ["Data & Storage Layer"]
        Postgres[("Managed PostgreSQL 16+<br/>(Neon / Supabase / RDS)<br/>pg_trgm Extension Enabled")]
        Redis[("Redis 7+ / Upstash<br/>Rate-limiting & WS Cluster Sync")]
        Resend["Resend / Transactional Email"]
    end

    Client -->|HTTPS / Next.js Pages & APIs| VercelEdge --> WebApp
    Client -->|WSS / Socket.IO| ChatProxy --> ChatSvc

    WebApp -->|Prisma Client| Postgres
    WebApp -->|Sliding Window Counters| Redis
    WebApp -->|Transactional Alerts| Resend
    ChatSvc -->|Session Verification API| WebApp
    ChatSvc -->|Redis Adapter Pub/Sub| Redis
```

---

## 2. Service Separation & Host Recommendations

| Component | Nature | Recommended Host | Why |
| :--- | :--- | :--- | :--- |
| **Web App (Next.js 16)** | Server-rendered pages, API routes, SSR, static assets | **Vercel** or **Render / Fly.io** | Fast global edge caching, seamless Next.js App Router optimization, zero-config CI/CD. |
| **Chat Service (`mini-services/chat-service`)** | Persistent WebSocket connections (Socket.IO) | **Fly.io**, **Railway**, or **VPS** | **Vercel serverless functions do not support persistent WebSockets.** A long-lived Node/Bun runtime is required. |
| **Database** | Relational data, GIN trigram indexes | **Neon** or **Supabase** | Managed PostgreSQL 16+, connection pooling (PgBouncer), automatic point-in-time recovery, branching. |
| **Cache & Pub/Sub** | In-memory key-value, cluster adapter | **Upstash Redis** or **Redis Cloud** | Low-latency sliding window rate limits and Socket.IO cluster broadcast. |
| **Email** | Transactional verification OTPs & status alerts | **Resend** or **SendGrid** | High deliverability to `.edu` and `.ac.in` university mailboxes. |

---

## 3. Environment Variables Matrix

### Web Application (`.env.production`)

```bash
# ------------------------------------------------------------------------------
# App & Security Secrets (Generate using: openssl rand -hex 32)
# ------------------------------------------------------------------------------
NODE_ENV="production"
NEXTAUTH_URL="https://placement.yourcollege.ac.in"
SESSION_SECRET="e9a2b7c4d8f102938475610293847561e9a2b7c4d8f102938475610293847561"
CSRF_SECRET="1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
INTERNAL_API_SECRET="9f8e7d6c5b4a3928170e9f8e7d6c5b4a3928170e9f8e7d6c5b4a3928170e9f8e"

# ------------------------------------------------------------------------------
# PostgreSQL Database (Neon / Supabase Connection Pooling)
# ------------------------------------------------------------------------------
# Pooled connection string (used by Prisma during runtime queries):
DATABASE_URL="postgresql://user:password@ep-cool-pooler.us-east-2.aws.neon.tech/placement_vault?sslmode=require&pgbouncer=true&connect_timeout=15"
# Direct connection string (used for schema migrations and DDL):
DIRECT_URL="postgresql://user:password@ep-cool.us-east-2.aws.neon.tech/placement_vault?sslmode=require"

# ------------------------------------------------------------------------------
# Redis (Rate Limiting & Session Cache)
# ------------------------------------------------------------------------------
REDIS_URL="rediss://default:your-upstash-token@your-endpoint.upstash.io:6379"

# ------------------------------------------------------------------------------
# Authentication (Google OAuth 2.0)
# ------------------------------------------------------------------------------
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-google-client-secret"

# ------------------------------------------------------------------------------
# Transactional Email (Resend)
# ------------------------------------------------------------------------------
RESEND_API_KEY="re_1234567890abcdef"
EMAIL_FROM="Placement Cell <notifications@placement.yourcollege.ac.in>"
EMAIL_DOMAIN="yourcollege.ac.in"

# ------------------------------------------------------------------------------
# Institution Customization
# ------------------------------------------------------------------------------
NEXT_PUBLIC_COLLEGE_NAME="Indian Institute of Engineering & Technology"
NEXT_PUBLIC_COLLEGE_DOMAIN="iiet.ac.in"
NEXT_PUBLIC_CHAT_URL="https://chat.placement.yourcollege.ac.in"

# ------------------------------------------------------------------------------
# Observability (Optional)
# ------------------------------------------------------------------------------
SENTRY_DSN="https://key@o123456.ingest.sentry.io/7890"
```

### Chat Service (`mini-services/chat-service/.env`)

```bash
NODE_ENV="production"
CHAT_PORT=3004
NEXT_AUTH_URL="https://placement.yourcollege.ac.in"
SESSION_SECRET="e9a2b7c4d8f102938475610293847561e9a2b7c4d8f102938475610293847561"
INTERNAL_API_SECRET="9f8e7d6c5b4a3928170e9f8e7d6c5b4a3928170e9f8e7d6c5b4a3928170e9f8e"
REDIS_URL="rediss://default:your-upstash-token@your-endpoint.upstash.io:6379"
CORS_ORIGIN="https://placement.yourcollege.ac.in"
```

---

## 4. Deploying the WebSocket Chat Service

Because Socket.IO requires continuous HTTP upgrade and persistent duplex TCP sockets, deploy the chat service to a long-lived container runner.

### Option A: Fly.io (Recommended)

1. Navigate to the chat service directory:
   ```bash
   cd mini-services/chat-service
   ```
2. Initialize and configure `fly.toml`:
   ```toml
   app = "campus-placement-chat"
   primary_region = "bom" # Mumbai region for India-first low latency

   [build]
     dockerfile = "Dockerfile"

   [env]
     NODE_ENV = "production"
     CHAT_PORT = "3004"
     CORS_ORIGIN = "https://placement.yourcollege.ac.in"

   [[services]]
     protocol = "tcp"
     internal_port = 3004

     [[services.ports]]
       port = 80
       handlers = ["http"]
       force_https = true

     [[services.ports]]
       port = 443
       handlers = ["tls", "http"]

     [services.concurrency]
       type = "connections"
       hard_limit = 2500
       soft_limit = 2000

     [[services.http_checks]]
       interval = "10s"
       timeout = "2s"
       grace_period = "5s"
       method = "get"
       path = "/health"
   ```
3. Set secrets:
   ```bash
   fly secrets set SESSION_SECRET="..." NEXT_AUTH_URL="..." REDIS_URL="..."
   ```
4. Deploy:
   ```bash
   fly deploy
   ```

### Option B: Linux VPS with Systemd + Caddy Reverse Proxy

1. Clone repo onto VPS and install Bun:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```
2. Create systemd unit `/etc/systemd/system/placement-chat.service`:
   ```ini
   [Unit]
   Description=Campus Placement Chat Service
   After=network.target

   [Service]
   Type=simple
   User=deploy
   WorkingDirectory=/home/deploy/placement-vault/mini-services/chat-service
   ExecStart=/home/deploy/.bun/bin/bun index.ts
   Restart=always
   RestartSec=5
   EnvironmentFile=/home/deploy/placement-vault/mini-services/chat-service/.env

   [Install]
   WantedBy=multi-user.target
   ```
3. Configure Caddy (`/etc/caddy/Caddyfile`) with automatic Let's Encrypt SSL:
   ```caddy
   chat.placement.yourcollege.ac.in {
       reverse_proxy localhost:3004 {
           header_up Host {host}
           header_up X-Real-IP {remote_host}
           header_up Upgrade {http.upgrade}
           header_up Connection {http.connection}
       }
   }
   ```

---

## 5. PostgreSQL Database Operations & Migrations

### Required Extensions
Before running migrations on fresh PostgreSQL instances:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Production Migration Execution
Never execute `prisma db push` in production. Always apply committed migration files:
```bash
bunx prisma migrate deploy
```

### Automated Daily Backups
Configure a cron job on your bastion or database host to export daily encrypted backups to AWS S3 / Cloudflare R2:

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/placement_vault_${BACKUP_DATE}.sql.gz"
S3_BUCKET="s3://your-backup-bucket/database"

# 1. Dump database with schema and data
pg_dump "${DIRECT_URL}" --format=plain --no-owner --no-acl | gzip -9 > "${BACKUP_FILE}"

# 2. Upload to S3/R2 with retention lifecycle
aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/placement_vault_${BACKUP_DATE}.sql.gz" --storage-class STANDARD_IA

# 3. Clean up local disk
rm -f "${BACKUP_FILE}"

echo "Database backup completed and uploaded successfully: placement_vault_${BACKUP_DATE}.sql.gz"
```

---

## 6. Secrets Rotation & Security Protocol

1. **Session & CSRF Secrets:**
   - When rotating `SESSION_SECRET` or `CSRF_SECRET`, existing active user sessions will be invalidated and prompt re-login.
   - Schedule secret rotations during off-peak maintenance hours (e.g. 3:00 AM IST).
2. **Google OAuth Client Credentials:**
   - If Google Client Secret is rotated in Google Cloud Console, update `GOOGLE_CLIENT_SECRET` in Vercel / environment management without zero-downtime disruption.
3. **Emergency Secret Leak Response:**
   - Immediately revoke leaked credentials from the provider (Google Cloud Console, Resend, Redis Upstash).
   - Generate fresh 64-character hex strings: `openssl rand -hex 32`.
   - Update Vercel environment variables and redeploy immediately.
   - Inspect `ModerationLog` table for unauthorized actions during the exposure window.

---

## 7. Staging Environment Runbook

To maintain 100% production uptime, run an isolated Staging environment:

1. **Database:** Use a separate Neon database branch (`placement_vault_staging`).
2. **Domain:** `staging.placement.yourcollege.ac.in`.
3. **Data Seeding:** Seed with test recruiters and mock submissions:
   ```bash
   DATABASE_URL=$STAGING_DB_URL bun run db:seed
   ```
4. **Verification:**
   - Execute test student registration and institutional OTP flow.
   - Submit test OA report and verify duplicate detection warning.
   - Approve submission as moderator and verify coin bounty payout (+50 +25).
   - Verify drive embargo: verify that test questions from an OPEN drive return `null` text.
