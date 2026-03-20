# Project Context — Sendita (anon-inbox)

Last updated: March 2026

---

## What This Is

An anonymous inbox platform. Users share a short link; anyone can send them anonymous messages without creating an account. Think NGL / ask.fm but built properly.

**Repo:** `git@github.com:deafcats/sendita.git`

---

## Architecture

### Monorepo structure (pnpm workspaces + Turborepo)

```
anon-inbox/
├── apps/
│   ├── api/        Next.js — all backend API routes (port 3001)
│   ├── web/        Next.js — public submission page /[username] (port 3000)
│   ├── admin/      Next.js — internal moderation dashboard (port 3002)
│   └── mobile/     React Native + Expo — iOS & Android inbox app
├── packages/
│   ├── db/         Drizzle ORM schema + migrations (PostgreSQL)
│   ├── shared/     Types, constants, utilities shared across all apps
│   └── queue/      BullMQ job queue definitions
├── workers/
│   ├── moderation/ Long-running worker — AI content moderation via OpenAI
│   ├── push/       Long-running worker — Expo push notifications
│   └── prompts/    Long-running worker — engagement prompt scheduling
└── tests/          Vitest unit/integration, Playwright e2e, k6 load tests
```

### Data flow

```
Mobile app / Browser
       ↓
   apps/api  (Next.js serverless — handles auth, messages, rate limiting)
       ↓
   PostgreSQL (messages stored AES-256 encrypted)
   Redis      (rate limiting, idempotency keys, session cache)
       ↓
   BullMQ queue
       ↓
   workers/moderation  (AI moderation → approve / flag / shadow-block)
   workers/push        (sends Expo push notifications to inbox owner)
   workers/prompts     (schedules engagement prompts)
       ↓
   apps/admin  (internal dashboard — review flagged messages, CSAM queue)
```

### Key design decisions

- **No sender accounts** — senders need nothing, just a link
- **AES-256 encryption at rest** — all message bodies encrypted in DB
- **IP hashing** — SHA-256 with daily-rotating salt, irreversible
- **Shadow banning** — abusive senders see 202 but message is never delivered
- **Idempotency** — atomic Redis SET NX prevents duplicate messages
- **Hot inbox protection** — per-inbox 200msg/hour cap, excess delayed 30s
- **COPPA age gate** — birth year required at registration, enforced server-side
- **CSAM pipeline** — auto-detection → admin review → NCMEC submission within 24h

---

## Tech Stack

| Layer | Tech |
|---|---|
| API / Web / Admin | Next.js 15, React 19, TypeScript |
| Mobile | React Native 0.76, Expo 52, Expo Router |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache / Queue | Redis 7 + BullMQ + ioredis |
| Auth | Deviceless JWT (no email/password — device secret hash) |
| Encryption | AES-256-GCM (Node.js crypto) |
| Moderation | OpenAI API |
| Push notifications | Expo Server SDK |
| Billing | Stripe |
| Styling | Tailwind CSS (web/admin) |
| Package manager | pnpm 9 + workspaces |
| Build system | Turborepo |

---

## Local Dev Setup

### Requirements
- Node.js 20+
- pnpm (`brew install pnpm`)
- Colima + Docker (`brew install colima docker docker-compose`)

### Start everything

```bash
# First time only — start Colima VM (lightweight Docker runtime)
colima start --cpu 2 --memory 2 --disk 10 --arch aarch64 --vm-type vz --vz-rosetta

# Start Postgres (port 5433) + Redis (port 6379) via Docker
cd /Users/sali/Downloads/anon-inbox
docker compose up -d

# Run DB migrations
DATABASE_URL="postgresql://anon:anon_dev_pass@127.0.0.1:5433/anon_inbox" pnpm --filter @anon-inbox/db db:migrate

# Start API (port 3001)
pnpm --filter @anon-inbox/api dev

# Start web (port 3000)
pnpm --filter @anon-inbox/web dev

# Start admin (port 3002)
pnpm --filter @anon-inbox/admin dev
```

### After a reboot
```bash
colima start
docker compose up -d
```

### docker-compose.yml uses
- Postgres: `anon` / `anon_dev_pass` on port `5433`
- Redis: default, port `6379`
- Data persists in named Docker volumes

---

## What's Been Built

### ✅ Complete

| Piece | Status | Notes |
|---|---|---|
| apps/api — all routes | ✅ Complete | auth, messages, links, billing, hints, reports, push tokens, health |
| apps/web — submission UI | ✅ Complete | purple/pink gradient form, confetti on send, viral CTA |
| apps/admin — dashboard UI | ✅ Complete | flagged message queue, approve/block/ban, CSAM queue with NCMEC form |
| packages/db — schema | ✅ Complete | 11 tables, migrations written and applied |
| packages/shared | ✅ Complete | types, constants, utils |
| packages/queue | ✅ Complete | BullMQ queue definitions |
| workers/moderation | ✅ Complete | OpenAI moderation, CSAM detection, shadow ban |
| workers/push | ✅ Complete | Expo push notifications |
| workers/prompts | ✅ Complete | engagement prompt scheduling |
| Mobile — all 5 screens | ✅ Complete | AgeGate, InboxDashboard, MessageViewer, ShareLink, SafetyTools |
| Mobile — navigation | ✅ Complete | Expo Router wired up (app.json, _layout, all routes) |
| Local dev infrastructure | ✅ Complete | Docker via Colima, migrations, env files |
| Test suite | ✅ 98/98 passing | unit, integration, security, edge cases, race conditions |
| Dockerfiles (6 services) | ✅ Written | Legacy fallback only — Railway buildpacks are the primary deploy path |
| GitHub repo | ✅ Live | github.com/deafcats/sendita |

### ⚠️ In Progress

| Piece | Status | Blocker |
|---|---|---|
| Railway deployment | 🔴 Failing | Builder config issue (see below) |

### ❌ Not Started

| Piece | Notes |
|---|---|
| Mobile icon/splash assets | Expo needs real PNGs in assets/ |
| Real API keys | OpenAI, Stripe, Expo — placeholders only |
| Production secrets | JWT_SECRET, ENCRYPTION_KEY need real random values |
| Domain / custom URL | Currently *.up.railway.app |

---

## Deployment — Railway (IN PROGRESS)

### What Railway project looks like

Railway project has these services (all pointing to `deafcats/sendita` GitHub repo):
- `@anon-inbox/api`
- `@anon-inbox/web`
- `@anon-inbox/admin`
- `@anon-inbox/worker-moderation`
- `@anon-inbox/worker-push` (truncated as worker-pr...)
- `@anon-inbox/worker-prompts` (truncated as worker-p...)
- `@anon-inbox/mobile` ← **WRONG, needs to be deleted** (mobile apps don't run on servers)
- Postgres plugin ✅ (online)
- Redis plugin ✅ (online — added but REDIS_URL reference not yet confirmed on all services)

### Current failure

Every service fails with:
```
Dockerfile `Dockerfile` does not exist
```

**Root cause:** Something in the Railway service configuration is forcing the Dockerfile builder instead of Railpack. We deleted `railway.toml` which had `builder = "dockerfile"` but Railway cached the setting per-service.

**Repo status now:** The monorepo has been refactored for Railway buildpacks. App start scripts now bind to Railway's injected `PORT`, worker packages have explicit no-op build scripts plus runtime-safe dependencies, and the canonical deployment commands are the root `railway:*` scripts plus the equivalent `pnpm --filter ...` commands.

**Fix needed in Railway UI:** For each service in Railway → Settings → Build → change Builder dropdown from "Dockerfile" to the Railway buildpack builder.

### Variables set on api service (31 total)

✅ Set: `ADMIN_IP_ALLOWLIST`, `ENCRYPTION_KEY`, `IP_HASH_SALT`, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_URL`, `DATABASE_URL` (linked to Railway Postgres), `REDIS_URL` (linked to Railway Redis), plus ~23 others from the suggested variables panel.

### Things tried that didn't work

| Attempt | Result |
|---|---|
| Created `railway.toml` with `builder = "dockerfile"` | Caused Dockerfile errors on all services |
| Deleted `railway.toml` | Railway still uses Dockerfile builder (cached in service settings) |
| Added `output: 'standalone'` to Next.js configs | Reverted — breaks `next start`, which the Railway buildpack flow now uses |
| Vercel deployment (earlier attempt) | Switched to Railway because workers can't run on serverless |

### What actually needs to happen next

1. **Delete `@anon-inbox/mobile`** service in Railway (it can't run on a server)
2. **For each service** → Settings → Build → change Builder to the Railway buildpack builder
3. **Set explicit build/start commands** from the repo root:
   - `@anon-inbox/api` → `pnpm --filter @anon-inbox/api build` / `pnpm --filter @anon-inbox/api start`
   - `@anon-inbox/web` → `pnpm --filter @anon-inbox/web build` / `pnpm --filter @anon-inbox/web start`
   - `@anon-inbox/admin` → `pnpm --filter @anon-inbox/admin build` / `pnpm --filter @anon-inbox/admin start`
   - `@anon-inbox/worker-moderation` → `pnpm --filter @anon-inbox/worker-moderation build` / `pnpm --filter @anon-inbox/worker-moderation start`
   - `@anon-inbox/worker-push` → `pnpm --filter @anon-inbox/worker-push build` / `pnpm --filter @anon-inbox/worker-push start`
   - `@anon-inbox/worker-prompts` → `pnpm --filter @anon-inbox/worker-prompts build` / `pnpm --filter @anon-inbox/worker-prompts start`
4. **Redeploy** `api` first, then `web` and `admin`, then the workers
5. **Generate domains** for api, web, admin (Networking → Generate Domain)
6. **Run DB migrations** against Railway Postgres once api is up
7. **Set `NEXT_PUBLIC_API_URL`** on web and admin to the real api Railway domain

---

## Environment Variables Reference

### Required everywhere
```
DATABASE_URL          postgresql://... (Railway Postgres auto-injects this)
REDIS_URL             redis://... (Railway Redis auto-injects this)
ENCRYPTION_KEY        32-byte hex (64 chars) — use real random in prod
JWT_SECRET            32+ char random string
IP_HASH_SALT          any random string, rotate daily in prod
```

### API only
```
OPENAI_API_KEY        For content moderation worker
STRIPE_SECRET_KEY     For billing
STRIPE_WEBHOOK_SECRET For Stripe webhook verification
EXPO_ACCESS_TOKEN     For push notifications
NEXT_PUBLIC_API_URL   Public URL of the api service
NEXT_PUBLIC_APP_URL   Public URL of the web service
```

### Admin only
```
ADMIN_IP_ALLOWLIST    0.0.0.0/0 for now, lock down to your IP in prod
```

### Local dev (.env.local files already configured in each app)
```
DATABASE_URL=postgresql://anon:anon_dev_pass@127.0.0.1:5433/anon_inbox
REDIS_URL=redis://localhost:6379
```

---

## File Locations

| File | Purpose |
|---|---|
| `docker-compose.yml` | Local Postgres + Redis containers |
| `apps/api/.env.local` | API local env (has real dev values) |
| `apps/admin/.env.local` | Admin local env |
| `apps/mobile/.env.local` | Mobile local env |
| `apps/web/tailwind.config.js` | Added (was missing) |
| `apps/admin/tailwind.config.js` | Added (was missing) |
| `apps/web/src/app/page.tsx` | Preview page with mock profile (local only) |
| `apps/mobile/app/` | Expo Router file-based routes |
| `apps/mobile/src/lib/store.ts` | In-memory store for passing message between screens |
| `apps/admin/src/app/page.tsx` | Flagged messages dashboard |
| `apps/admin/src/app/csam/page.tsx` | CSAM report queue |
| `Dockerfile.*` | Legacy Docker images kept as a fallback; not the primary production path |
| `RAILWAY.md` | Canonical Railway deployment guide with service matrix and rollout checklist |
| `PROBLEMS_LOG.md` | Full log of 22 bugs found and fixed during dev |
