# Anon Inbox — Project Overview

## What Is This?

Anon Inbox is a full-stack anonymous messaging platform. A user creates an account and gets a short shareable link (e.g. `anon.app/to/jake`). Anyone can open that link and send them a message — no account, no login, no identity revealed. The receiver reads messages in a mobile app (iOS / Android) or web dashboard.

Think: anonymous Q&A / confession box, built to production standards with encryption, moderation, abuse protection, and monetization.

---

## Tech Stack at a Glance

| Layer | Technology |
|---|---|
| API (backend) | Next.js API Routes (Vercel / Edge Functions) |
| Web (submission page) | Next.js |
| Mobile app | React Native + Expo (iOS & Android) |
| Admin dashboard | Next.js (IP-allowlisted, internal) |
| Database | PostgreSQL 16 via Drizzle ORM |
| Queue / workers | BullMQ (backed by Redis) |
| Push notifications | Expo Push API |
| Content moderation | OpenAI + Google Perspective API |
| Payments | Stripe |
| Captcha | hCaptcha |
| Bot fingerprinting | FingerprintJS |
| Error tracking | Sentry |
| Analytics | Tinybird |
| Local infra | Docker Compose (Postgres + Redis) |

---

## Monorepo Structure

This is a **pnpm workspace monorepo** managed with **Turborepo**.

```
anon-inbox/
├── apps/
│   ├── api/        # Next.js backend — all REST API routes
│   ├── web/        # Next.js submission page (/to/[slug]) — public-facing
│   ├── mobile/     # React Native + Expo — the receiver's app
│   └── admin/      # Internal admin dashboard (IP-allowlisted)
│
├── packages/
│   ├── db/         # Drizzle ORM schema, migrations, DB client
│   ├── shared/     # Types, constants, and utilities shared across apps
│   └── queue/      # BullMQ queue definitions (job types, queue names)
│
├── workers/
│   ├── moderation/ # AI content moderation worker (runs after message is saved)
│   ├── push/       # Push notification worker (sends Expo push after moderation)
│   └── prompts/    # Engagement prompt worker (scheduled nudges)
│
└── tests/
    ├── unit/           # Fast Vitest unit tests (no DB/Redis required)
    ├── integration/    # Vitest integration tests (real DB + Redis)
    ├── e2e/web/        # Playwright browser tests
    ├── e2e/mobile/     # Detox mobile tests
    ├── load/           # k6 load testing scenarios
    ├── security/       # Auth attack / abuse tests
    ├── edge-cases/     # Boundary condition tests
    ├── race-conditions/# Concurrency safety tests
    ├── fixtures/       # Seed data
    └── helpers/        # Test factories and utilities
```

---

## How a Message Flows Through the System

```
1. Sender opens  https://app.com/to/jake
2. Web page (apps/web) renders the submission form
3. Sender submits → POST /api/messages  (apps/api)
4. API checks: rate limit, captcha, honeypot, idempotency key
5. API encrypts message body (AES-256), writes to Postgres, returns 202
6. Moderation job is pushed to BullMQ queue
7. Moderation worker (workers/moderation) calls OpenAI + Perspective API
8. If clean → push notification job queued
9. Push worker (workers/push) sends Expo notification to receiver's device
10. Receiver reads message in the mobile app or web dashboard
```

---

## Key API Routes

| Method | Route | What it does |
|---|---|---|
| POST | `/api/auth/register` | Create account, get JWT + refresh token |
| POST | `/api/auth/login` | Login, get JWT + refresh token |
| POST | `/api/auth/refresh` | Rotate refresh token, get new JWT |
| DELETE | `/api/auth/logout` | Revoke session (blocklist JTI) |
| GET | `/api/links` | Get the user's shareable inbox link |
| POST | `/api/messages` | Submit an anonymous message (public, no auth) |
| GET | `/api/messages` | List received messages (cursor-paginated, auth required) |
| DELETE | `/api/messages/:id` | Delete a message |
| POST | `/api/reports` | Report a message |
| GET | `/api/hints` | Get purchased hints (who sent a message) |
| POST | `/api/billing/checkout` | Start Stripe checkout session |
| POST | `/api/billing/webhook` | Stripe webhook handler |
| GET | `/api/health` | Health check |

---

## Database Schema (tables)

| Table | Purpose |
|---|---|
| `users` | Accounts — auth credentials, slug, settings |
| `messages` | Encrypted anonymous messages |
| `reports` | User-submitted abuse reports |
| `hints` | Purchased sender hints |
| `subscriptions` | Stripe subscription records |
| `prompts` | Engagement prompt templates |
| `analytics` | Event tracking |
| `audit` | Audit log for admin actions |

---

## Security Features

- **AES-256 encryption at rest** — all message bodies are encrypted before being stored
- **IP hashing** — SHA-256 with a daily-rotating salt; sender IPs are never stored in plain text
- **JWT blocklist** — logout actually invalidates the token (Redis JTI blocklist)
- **Atomic refresh token rotation** — prevents replay attacks (single `UPDATE ... WHERE revokedAt IS NULL RETURNING *`)
- **Honeypot field** — silent 202 for bots filling the hidden field
- **Shadow banning** — abusive senders get a 202, message is silently discarded
- **CSAM pipeline** — automatic detection → admin review queue → NCMEC submission
- **Per-inbox rate limit** — 200 messages/hour max, excess queued to secondary

---

## Deployment Targets

| Service | Platform |
|---|---|
| API + Web apps | Vercel |
| Admin dashboard | Vercel (private project with IP allowlist) |
| Workers | Railway or Render (long-running containers) |
| PostgreSQL | Neon, Supabase, or AWS RDS |
| Redis | Upstash (serverless-compatible) |

---

## Development Phases

- **Phase 1 — Core**: Auth, slugs, message submission, inbox dashboard, push notifications
- **Phase 2 — Safety**: AI moderation, rate limiting, CSAM pipeline, admin dashboard
- **Phase 3 — Monetization**: Hint system (pay to see who sent a message), Stripe billing, IAP
- **Phase 4 — Growth**: Engagement prompts, viral loop, analytics, vanity slugs

---

## Current Status

As of the last working session, the local dev environment was fully operational:

| Layer | Status |
|---|---|
| Docker (Postgres port 5433, Redis 6379) | Running |
| Database migrations | Applied |
| Seed data (10 engagement prompts) | Seeded |
| API (`localhost:3001`) | Running, all routes compiled |
| Web (`localhost:3000`) | Running |
| Unit tests (60 tests) | All passing |
| Integration tests (18 tests) | All passing |
| Security tests (9 tests) | All passing |
| Edge case tests (8 tests) | All passing |
| Race condition tests (3 tests) | All passing |
| **Total: 98/98 tests** | **All passing** |

See `PROBLEMS_LOG.md` for a full log of bugs found and fixed during setup.
