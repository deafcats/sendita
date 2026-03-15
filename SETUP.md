# Anon Inbox — Setup Guide

This guide gets you from a fresh clone to a fully running local dev environment with all 98 tests passing.

---

## Prerequisites

Install these before you start:

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | https://nodejs.org or `nvm install 20` |
| pnpm | 9+ | `npm install -g pnpm@9` |
| Docker Desktop | Latest | https://www.docker.com/products/docker-desktop |

Verify:
```bash
node --version   # v20.x.x
pnpm --version   # 9.x.x
docker --version # Docker version 25.x.x
```

---

## Step 1 — Install Dependencies

```bash
cd anon-inbox
pnpm install
```

This installs all dependencies across every workspace package at once (root, apps, packages, workers, tests).

---

## Step 2 — Set Up Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the required values. For local development, the minimum you need is:

```env
# These are pre-filled for local Docker (see Step 3):
DATABASE_URL=postgresql://anon:anon_dev_pass@localhost:5433/anon_inbox
REDIS_URL=redis://localhost:6379

# Generate these:
JWT_SECRET=<run: openssl rand -hex 32>
ENCRYPTION_KEY=<run: openssl rand -hex 32>
IP_HASH_SALT=<run: openssl rand -hex 16>

# Third-party keys (get from each service's dashboard):
OPENAI_API_KEY=sk-...
EXPO_ACCESS_TOKEN=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_ANNUAL=price_...
HCAPTCHA_SECRET=...
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=...
NEXT_PUBLIC_FPJS_PUBLIC_KEY=...
SENTRY_DSN=...
NCMEC_API_KEY=...
NCMEC_ORG_ID=...
TINYBIRD_API_KEY=...

# Leave these as-is for local dev:
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
DISABLE_RATE_LIMIT=true
```

> **Note:** For unit tests only, you can skip all third-party keys. Integration tests require at minimum `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and `ENCRYPTION_KEY`.

Also copy the env file into each app that needs it:
```bash
cp .env.local apps/api/.env.local
cp .env.local apps/web/.env.local
```

---

## Step 3 — Start Docker (Postgres + Redis)

Make sure Docker Desktop is running, then:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on port `5433` (not 5432, to avoid conflicting with a local install)
- **Redis 7** on port `6379`

Check they are healthy:
```bash
docker compose ps
```

Both should show `healthy` status.

---

## Step 4 — Run Database Migrations

```bash
pnpm --filter @anon-inbox/db db:migrate
```

Then seed the engagement prompts table:
```bash
psql $DATABASE_URL < packages/db/src/migrations/seed-prompts.sql
```

Or if `psql` isn't installed locally, run via Docker:
```bash
docker exec -i anon-inbox-postgres psql -U anon -d anon_inbox < packages/db/src/migrations/seed-prompts.sql
```

---

## Step 5 — Start the Dev Servers

### Option A — One command (recommended)

```bash
./scripts/dev-start.sh
```

This starts the API (`localhost:3001`) and Web (`localhost:3000`) apps together using Turborepo.

### Option B — Manually

```bash
# Terminal 1 — API
pnpm --filter @anon-inbox/api dev

# Terminal 2 — Web
pnpm --filter @anon-inbox/web dev
```

### Option C — Start everything + run tests

```bash
./scripts/dev-start.sh --test
```

---

## Step 6 — Run the Tests

```bash
# Unit tests (fast, no external deps needed)
pnpm test:unit

# Integration tests (requires running DB + Redis)
API_URL=http://localhost:3001 pnpm test:integration

# Security tests
API_URL=http://localhost:3001 pnpm vitest run tests/security/

# Race condition tests
API_URL=http://localhost:3001 pnpm vitest run tests/race-conditions/

# Edge case tests
API_URL=http://localhost:3001 pnpm vitest run tests/edge-cases/
```

Or run the full suite via the helper script (which warms up routes first):
```bash
./scripts/test.sh
```

---

## Common Issues

### Port 5432 already in use
The docker-compose maps Postgres to **5433** (not 5432) specifically to avoid this. Make sure your `DATABASE_URL` uses port `5433`.

### `pnpm install` workspace warning
If you see `"workspaces" field not supported`, you're using npm instead of pnpm. Run `npm install -g pnpm@9` and retry.

### First request to API takes 10–30 seconds
This is normal in Next.js dev mode — it compiles routes on first hit. The `dev-start.sh` script warms up all routes automatically. Subsequent requests are instant.

### Integration tests return 429 (rate limited)
Make sure `DISABLE_RATE_LIMIT=true` is in your `.env.local`. This disables rate limiting for local dev/testing.

### DB pool exhaustion under load
The DB client is a singleton — if you see connection errors under concurrent test load, check that `getPrimaryClient()` in `packages/db/src/client.ts` is returning the cached instance, not creating a new pool per call.

---

## Project Scripts Reference

| Command | What it does |
|---|---|
| `pnpm install` | Install all dependencies |
| `pnpm dev` | Start all apps in dev mode (Turborepo) |
| `pnpm build` | Build all apps |
| `pnpm test:unit` | Run unit tests |
| `pnpm test:integration` | Run integration tests |
| `pnpm test:e2e` | Run Playwright web E2E tests |
| `pnpm db:migrate` | Run DB migrations |
| `pnpm db:generate` | Generate new migration from schema changes |
| `./scripts/dev-start.sh` | Start Docker + API + Web |
| `./scripts/dev-start.sh --test` | Start everything, then run full test suite |
| `./scripts/test.sh` | Run full test suite (warms up routes first) |

---

## Deploying to Production

| Service | Platform | Notes |
|---|---|---|
| `apps/api` | Railway buildpack service | Build from repo root with `pnpm --filter @anon-inbox/api build` |
| `apps/web` | Railway buildpack service | Build from repo root with `pnpm --filter @anon-inbox/web build` |
| `apps/admin` | Railway buildpack service | Build from repo root with `pnpm --filter @anon-inbox/admin build` |
| `workers/*` | Railway worker services | Long-running Node processes started from the repo root |
| PostgreSQL | Railway Postgres or managed Postgres | Point `DATABASE_URL` at your hosted DB |
| Redis | Railway Redis or managed Redis | Point `REDIS_URL` at your hosted Redis |

Use Railway buildpacks for all server-side services. Configure each Railway service from the monorepo root, set explicit build/start commands per service, and follow the rollout checklist in `RAILWAY.md`. Do not create a Railway service for `apps/mobile`.
