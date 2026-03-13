# Anon Inbox

A production-ready anonymous inbox platform. Users share a short link; anyone can send them anonymous messages without creating an account. Built with React Native (Expo), Next.js, Node.js serverless, PostgreSQL, and Redis.

## Monorepo Structure

```
anon-inbox/
├── apps/
│   ├── api/          # Next.js API (Vercel Functions / Edge)
│   ├── web/          # Next.js submission page (/to/[slug])
│   ├── mobile/       # React Native + Expo (iOS & Android)
│   └── admin/        # Internal admin dashboard (IP-allowlisted)
├── packages/
│   ├── db/           # Drizzle ORM schema + migrations
│   ├── shared/       # Shared types, constants, utilities
│   └── queue/        # BullMQ queue definitions
├── workers/
│   ├── moderation/   # AI content moderation worker
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

# Seed engagement prompts
psql $DATABASE_URL < packages/db/src/migrations/seed-prompts.sql

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

**Required for production:**
- `DATABASE_URL` — PostgreSQL primary connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` — 256-bit secret for JWT signing
- `ENCRYPTION_KEY` — 32-byte hex key for AES-256 message encryption
- `IP_HASH_SALT` — Daily-rotating salt for IP hashing
- `OPENAI_API_KEY` — For content moderation
- `EXPO_ACCESS_TOKEN` — For push notifications
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` — For billing

## Architecture Overview

See the full architecture plan in `.cursor/plans/`.

### Key Design Decisions

- **No sender accounts**: Senders need nothing — just a link
- **Async message processing**: API returns 202 immediately; moderation runs in BullMQ workers
- **Cursor-based pagination**: Inbox dashboard uses keyset pagination, never offset
- **AES-256 encryption at rest**: All message bodies encrypted; keys in secrets manager
- **IP hashing**: SHA-256 with daily-rotating salt — irreversible within the day
- **Hot inbox protection**: Per-inbox 200msg/hour limit; excess delayed to secondary queue
- **Shadow banning**: Abusive senders blocked silently (they see 202, message never delivered)
- **CSAM pipeline**: Automatic detection → admin review queue → NCMEC submission within 24h

## Deployment

- **API + Web**: Deploy to Vercel (`apps/api`, `apps/web`)
- **Admin**: Deploy to a private Vercel project with IP allowlist middleware
- **Workers**: Deploy to Railway or Render as long-running containers
- **Database**: Neon, Supabase, or RDS PostgreSQL
- **Redis**: Upstash Redis (serverless-compatible)

## Phases

- **Phase 1** (Core): Auth, slugs, message submission, inbox dashboard, push notifications
- **Phase 2** (Safety): Moderation worker, rate limiting, CSAM pipeline, admin dashboard
- **Phase 3** (Monetization): Hint system, Stripe billing, IAP
- **Phase 4** (Growth): Engagement prompts, viral loop, analytics, vanity slugs
