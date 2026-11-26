# Campus Placement Hub (`CPH`)

Company-wise Online Assessment (OA) archive, interview experiences, placement drive tracker, peer Q&A, DSA practice tracker, and real-time cohort chat — built by students, for students.

## Overview

Campus Placement Hub incentivizes seniors and placed students to contribute verified OA reports and interview experiences through a moderated coin economy, while using drive embargoes to keep active test questions fair until a drive closes.

### Core Features

- **Company Prep Packs & Hubs** — Company-wise directory with interview experiences, OA reports, topic tags, and difficulty filters.
- **Placement Drives & Embargo Control** — Track upcoming and ongoing campus drives (`OPEN` drives withhold approved OA bodies until a moderator closes the drive).
- **Coin Economy & Atomic Ledger** — Contributors earn coins after moderation and unlock gated OA reports server-side inside Prisma database transactions:
  - Welcome grant (on roll-number verification): **+25**
  - Approved OA report: **+50**
  - Approved interview experience: **+40**
  - Accepted doubt answer: **+30**
  - Upvotes received: **+2** each (capped at **20/day**)
  - Unlock an OA report: **-25**
  - Anti-farming post cap: **5 contributions/day**
- **Doubts & Q&A** — Anonymous or named company-tagged questions with accepted answers and content flagging.
- **Practice Tracker & Streaks** — Curated coding problems and practice sets with local progress and streak tracking.
- **Real-Time Cohort Chat** — Dedicated Bun + Socket.IO microservice (`mini-services/chat-service`) with SQLite persistence and `#referrals` restricted to signed-in users.
- **Moderation Queue** — Dedicated review workflow (`MOD` / `ADMIN`) for approving/rejecting OA reports, interview experiences, student roll numbers, flags/takedowns, and lifting drive embargoes.

## Tech Stack

- **Web App:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, shadcn/ui (Radix), TanStack Query, Zustand
- **Database:** SQLite + Prisma ORM v6 (`prisma/schema.prisma`)
- **Auth & Security:** Google OAuth 2.0 (Authorization Code + PKCE + JWKS RS256 verification), HMAC-SHA256 signed cookies (`cph_session`), HMAC-bound CSRF tokens (`X-CSRF-Token`), Zod v4 validation, sliding/fixed-window rate limiting, Caddy TLS + CSP headers
- **Chat Service:** Bun + Socket.IO + `bun:sqlite` (`mini-services/chat-service/index.ts`)

## Project Structure

```text
├── src/
│   ├── app/
│   │   ├── api/            # Next.js API Route Handlers (auth, drives, reports, coins, mod)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── app/            # Header, Footer, React Query providers
│   │   ├── auth/           # Sign-in dialog & roll-number onboarding
│   │   ├── shared/         # Cards, doubt threads, flag dialogs
│   │   ├── ui/             # shadcn/ui primitives
│   │   └── views/          # Home, Companies, Drives, Contribute, Problems, Chat, Wallet, Profile, Mod Queue
│   ├── data/               # Static config (economy rates/caps), companies, problems, sets
│   └── lib/                # Prisma client, auth, OAuth/JWKS, session, CSRF, rate-limit, Zod schemas, coins
├── mini-services/
│   └── chat-service/       # Authenticated Socket.IO chat server (port 3004)
├── prisma/
│   ├── schema.prisma       # SQLite schema
│   └── seed.ts             # Sample campus dataset
├── Caddyfile               # Reverse proxy: TLS, security headers, /ws/chat -> :3004, app -> :3000
├── next.config.ts          # CSP & HTTP security headers
└── .env.example            # Environment variable template
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.3+ (or Node.js 20+ for Next.js; Bun is required for `mini-services/chat-service`)

### 1. Install dependencies

```bash
bun install
cd mini-services/chat-service && bun install && cd ../..
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your secrets:

```bash
cp .env.example .env
```

Generate a 64-character hex `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Key variables in `.env`:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | SQLite path relative to `prisma/schema.prisma` (e.g. `file:../db/custom.db`) |
| `SESSION_SECRET` | Required >=32-character secret for session, WebSocket, and CSRF HMAC signing |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret |
| `GOOGLE_REDIRECT_URI` | Optional callback override (defaults to `<origin>/api/auth/google/callback`) |
| `APP_URL` | Canonical origin used for OAuth callbacks & CSRF host validation (e.g. `http://localhost:3000` locally or `https://your-domain` behind Caddy) |
| `SITE_ADDRESS` | Hostname used by `Caddyfile` (defaults to `localhost`) |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed for WebSocket chat CORS |
| `CHAT_MAIN_DB_PATH` | Path from `mini-services/chat-service` to the main SQLite DB (`../../db/custom.db` when run from inside `mini-services/chat-service`, or `./db/custom.db` from repo root) |
| `ENABLE_DEV_DEMO_AUTH` | Set `"true"` **only** in `development` to enable allowlisted demo account switching (`POST /api/auth/demo`) |

### 3. Initialize and seed the database

```bash
bun run db:generate
bun run db:push
bun prisma/seed.ts
```

> **Note for local Google OAuth callback:** Set your authorized redirect URI in Google Cloud Console to `http://localhost:3000/api/auth/google/callback` (when running Next.js directly) or `https://localhost/api/auth/google/callback` (when running behind Caddy).

### 4. Run in development

Start the Next.js app (terminal 1):

```bash
bun run dev
```

Start the Socket.IO chat service on port `3004` (terminal 2):

```bash
cd mini-services/chat-service
bun --hot index.ts
```

If running Next.js directly on port `3000` without Caddy in front, set `NEXT_PUBLIC_CHAT_URL="http://localhost:3004"` and include `http://localhost:3000` in `ALLOWED_ORIGINS` (or run Caddy cleanly to terminate TLS and route `/ws/chat*` automatically).

## Scripts & Verification

```bash
# Type-check & lint
bunx tsc --noEmit
bun run lint

# Production build (Next.js)
bunx next build

# Bundle-check chat service
cd mini-services/chat-service && bun build index.ts --target=bun --outdir=.tmp-check
```

## Production Reverse Proxy (`Caddyfile`)

The included [`Caddyfile`](Caddyfile) configures:

- Automatic HTTPS via `{$SITE_ADDRESS:localhost}`
- Security headers (`Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`)
- Dedicated `/ws/chat*` reverse proxy to `localhost:3004`
- Application traffic reverse proxy to `localhost:3000`

## Security Architecture Notes

- **No client-trusted identity or coins:** Every reward, unlock, vote toggle, drive embargo check, and moderation state transition is validated server-side and executed atomically inside `db.$transaction(...)`.
- **Fail-closed secrets:** Both `src/lib/session.ts` and `mini-services/chat-service/index.ts` require a configured `SESSION_SECRET` and never fall back to a hardcoded default.
- **Before pushing a fork:** Ensure local runtime artifacts (`.env`, `db/custom.db`, `mini-services/chat-service/chat.db`) are untracked from Git (`git rm --cached .env db/custom.db mini-services/chat-service/chat.db`) before committing to a remote repository.

