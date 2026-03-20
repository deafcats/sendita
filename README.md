# Sendita

A web-first streamer question inbox. Streamers get a permanent public link, fans submit questions without accounts, and the streamer manages everything from a browser dashboard.

## Monorepo Structure

```
anon-inbox/
├── apps/
│   ├── api/          # Next.js API service
│   ├── web/          # Next.js public site + dashboard
│   ├── mobile/       # Legacy React Native + Expo app
│   └── admin/        # Internal admin dashboard
├── packages/
│   ├── db/           # Drizzle ORM schema + migrations
│   ├── shared/       # Shared types, constants, utilities
│   └── queue/        # BullMQ queue definitions
├── workers/
│   ├── moderation/   # Optional async moderation worker
│   ├── push/         # Push notification worker (Expo)
│   └── prompts/      # Engagement prompt worker
└── tests/
    ├── unit/         # Vitest unit tests
    ├── integration/  # Vitest integration tests (real DB + Redis)
    ├── e2e/
    │   ├── web/      # Playwright web E2E tests
    │   └── mobile/   # Detox mobile E2E tests
    ├── load/         # k6 load test scenarios
    ├── security/     # Security and auth attack tests
    ├── edge-cases/   # Edge case tests
    ├── race-conditions/ # Concurrency tests
    ├── fixtures/     # Test seed data
    └── helpers/      # Test utilities and factories
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+
- Redis 7+
- Docker (for local dev)

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment config
cp .env.example .env
# Fill in required values in .env

# Run database migrations
pnpm --filter @anon-inbox/db db:migrate

# Start all apps in development
pnpm dev
```

## Running Tests

```bash
# Unit tests only (fast, no external dependencies)
pnpm test:unit

# Integration tests (requires DATABASE_URL and REDIS_URL)
API_URL=http://localhost:3001 pnpm test:integration

# E2E web tests (requires running web + API)
WEB_URL=http://localhost:3000 API_URL=http://localhost:3001 pnpm test:e2e

# Load tests (requires k6 installed)
API_URL=http://localhost:3001 TARGET_SLUG=myslug k6 run tests/load/scenarios/viral-inbox.js

# Security tests (integration tests targeting security scenarios)
API_URL=http://localhost:3001 pnpm vitest run tests/security/

# Race condition tests
API_URL=http://localhost:3001 pnpm vitest run tests/race-conditions/

# Edge case tests
API_URL=http://localhost:3001 pnpm vitest run tests/edge-cases/
```

## Environment Variables

See `.env.example` for all required and optional variables.

**Required for the web-first MVP:**
- `DATABASE_URL` — PostgreSQL primary connection string
- `REDIS_URL` — Redis connection string
- `ENCRYPTION_KEY` — 32-byte hex key for AES-256 message encryption
- `IP_HASH_SALT` — Daily-rotating salt for IP hashing
- `NEXT_PUBLIC_API_URL` — Browser-facing API base URL
- `NEXT_PUBLIC_APP_URL` — Public web app base URL

## Architecture Overview

See `PROJECT_OVERVIEW.md` for the current architecture brief, target web-first MVP, tech stack, keep/refactor/defer decisions, and Railway deployment shape.

### Key Design Decisions

- **No sender accounts**: Senders need nothing — just a link
- **Web auth via session cookies**: Jake logs in with email/password, not device tokens
- **Classic moderation rules**: Blocked/flagged keywords are owned by Jake, no LLM moderation in the main flow
- **Cursor-based pagination**: Inbox dashboard uses keyset pagination, never offset
- **AES-256 encryption at rest**: All message bodies encrypted; keys in secrets manager
- **IP hashing**: SHA-256 with daily-rotating salt — irreversible within the day
- **Hot inbox protection**: Per-inbox 200msg/hour limit; excess delayed to secondary queue
- **Shadow banning**: Abusive senders blocked silently (they see 202, message never delivered)

## Deployment

- **API + Web**: Deploy to Railway as separate buildpack-backed services
- **Workers**: Optional for the current MVP
- **Database**: Use Railway Postgres or another managed PostgreSQL service
- **Redis**: Use Railway Redis or another managed Redis service
- **Mobile**: Deferred from the current MVP

See `RAILWAY.md` for the exact per-service Railway settings, build commands, start commands, required environment variables, and rollout order.

## Phases

- **Phase 1** (Core): web auth, slugs, question submission, dashboard inbox
- **Phase 2** (Safety): classic moderation rules, spam limits, reports
- **Phase 3** (Product): analytics depth, moderation UX, creator settings
- **Phase 4** (Expansion): monetization, async workers, legacy cleanup
