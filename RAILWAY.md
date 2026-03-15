# Railway Deployment Guide

This repo is deployed to Railway as a `pnpm` workspace monorepo using Railway's buildpack builder. The deployable server-side services are:

- `@anon-inbox/api`
- `@anon-inbox/web`
- `@anon-inbox/admin`
- `@anon-inbox/worker-moderation`
- `@anon-inbox/worker-push`
- `@anon-inbox/worker-prompts`

Do not deploy `apps/mobile` to Railway. It is a React Native app, not a server process.

## Deployment Model

- Builder: Railway buildpack
- Root directory: repo root
- Package manager: `pnpm@9.15.0`
- Install strategy: Railway should install dependencies from the repo root so workspace packages under `packages/*` resolve correctly
- Dockerfiles: kept in the repo as a legacy fallback only; they are not the primary production path

## Service Commands

Configure each Railway service from the repo root with explicit build and start commands.

| Service | Build command | Start command |
|---|---|---|
| `@anon-inbox/api` | `pnpm --filter @anon-inbox/api build` | `pnpm --filter @anon-inbox/api start` |
| `@anon-inbox/web` | `pnpm --filter @anon-inbox/web build` | `pnpm --filter @anon-inbox/web start` |
| `@anon-inbox/admin` | `pnpm --filter @anon-inbox/admin build` | `pnpm --filter @anon-inbox/admin start` |
| `@anon-inbox/worker-moderation` | `pnpm --filter @anon-inbox/worker-moderation build` | `pnpm --filter @anon-inbox/worker-moderation start` |
| `@anon-inbox/worker-push` | `pnpm --filter @anon-inbox/worker-push build` | `pnpm --filter @anon-inbox/worker-push start` |
| `@anon-inbox/worker-prompts` | `pnpm --filter @anon-inbox/worker-prompts build` | `pnpm --filter @anon-inbox/worker-prompts start` |

Equivalent convenience scripts are also available at the repo root:

- `pnpm railway:build:api`
- `pnpm railway:start:api`
- `pnpm railway:build:web`
- `pnpm railway:start:web`
- `pnpm railway:build:admin`
- `pnpm railway:start:admin`
- `pnpm railway:build:worker-moderation`
- `pnpm railway:start:worker-moderation`
- `pnpm railway:build:worker-push`
- `pnpm railway:start:worker-push`
- `pnpm railway:build:worker-prompts`
- `pnpm railway:start:worker-prompts`

## Runtime Notes

- The Next.js apps now start with `next start --port ${PORT:-...}` so they work locally and on Railway.
- The workers now have explicit `build` scripts, and those build steps are intentional no-ops because the services run directly via `tsx` in production.
- `tsx` is installed as a runtime dependency for the worker packages so Railway can start them reliably in production.
- The internal workspace packages (`@anon-inbox/db`, `@anon-inbox/shared`, `@anon-inbox/queue`) are consumed directly from the monorepo, so each Railway service must build from the repo root.

## Environment Variables

### Required on every server-side service

```env
DATABASE_URL=
REDIS_URL=
ENCRYPTION_KEY=
JWT_SECRET=
IP_HASH_SALT=
```

### App and worker specifics

- `@anon-inbox/api`
  - `OPENAI_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `EXPO_ACCESS_TOKEN`
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_APP_URL`
- `@anon-inbox/web`
  - `NEXT_PUBLIC_API_URL`
- `@anon-inbox/admin`
  - `NEXT_PUBLIC_API_URL`
  - `ADMIN_IP_ALLOWLIST`
- `@anon-inbox/worker-moderation`
  - `OPENAI_API_KEY`
- `@anon-inbox/worker-push`
  - `EXPO_ACCESS_TOKEN`

## Railway UI Checklist

1. Delete the `@anon-inbox/mobile` service if it exists.
2. For each remaining service, open `Settings -> Build`.
3. Change the builder from Dockerfile to Railway's buildpack builder.
4. Set the build and start commands from the service matrix above.
5. Confirm `DATABASE_URL` and `REDIS_URL` are linked on every service that needs them.

## Recommended Rollout Order

1. Deploy `@anon-inbox/api`.
2. Generate the public domain for `api`.
3. Set `NEXT_PUBLIC_API_URL` on `web` and `admin` to the live `api` domain.
4. Deploy `@anon-inbox/web`.
5. Deploy `@anon-inbox/admin`.
6. Deploy the 3 workers.
7. Run DB migrations against Railway Postgres.
8. Seed engagement prompts if production depends on them.

## Post-Deploy Smoke Tests

1. Open the public web app and submit an anonymous message.
2. Confirm the API is healthy and the message is written to Postgres.
3. Confirm the moderation worker consumes the queue job.
4. Confirm the push worker handles notification jobs if push is configured.
5. Confirm the admin dashboard loads and can view moderation state.
6. Confirm Redis-backed flows such as rate limiting and queue activity are working.

## Troubleshooting

- If Railway still reports `Dockerfile 'Dockerfile' does not exist`, the service is still pinned to Dockerfile mode in Railway settings.
- Do not reintroduce `output: 'standalone'` in the Next.js configs for this deployment path. The current Railway flow uses `next start`.
- Do not point Railway at the individual app folders as the service root. The repo root is required for workspace dependency resolution.
