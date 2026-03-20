# Railway Deployment Guide

This repo is deployed to Railway as a `pnpm` workspace monorepo using Railway's buildpack builder. For the current web-first MVP, the deployable server-side services are:

- `@anon-inbox/api`
- `@anon-inbox/web`

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

Equivalent convenience scripts are also available at the repo root:

- `pnpm railway:build:api`
- `pnpm railway:start:api`
- `pnpm railway:build:web`
- `pnpm railway:start:web`
## Runtime Notes

- The Next.js apps start with `next start --port ${PORT:-...}` so they work locally and on Railway.
- The internal workspace packages (`@anon-inbox/db`, `@anon-inbox/shared`, `@anon-inbox/queue`) are consumed directly from the monorepo, so each Railway service must build from the repo root.

## Environment Variables

### Required on every server-side service

```env
DATABASE_URL=
REDIS_URL=
ENCRYPTION_KEY=
IP_HASH_SALT=
```

### App and worker specifics

- `@anon-inbox/api`
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_APP_URL`
- `@anon-inbox/web`
  - `NEXT_PUBLIC_API_URL`

## Railway UI Checklist

1. Delete the `@anon-inbox/mobile` service if it exists.
2. Do not deploy `@anon-inbox/admin` or the workers for the current MVP unless you explicitly need them.
3. For each remaining service, open `Settings -> Build`.
4. Change the builder from Dockerfile to Railway's buildpack builder.
5. Set the build and start commands from the service matrix above.
6. Confirm `DATABASE_URL` and `REDIS_URL` are linked on every service that needs them.

## Recommended Rollout Order

1. Deploy `@anon-inbox/api`.
2. Generate the public domain for `api`.
3. Set `NEXT_PUBLIC_API_URL` on `web` to the live `api` domain.
4. Deploy `@anon-inbox/web`.
5. Run DB migrations against Railway Postgres.

## Post-Deploy Smoke Tests

1. Open the public web app and submit a question.
2. Confirm the API is healthy and the question is written to Postgres.
3. Register a streamer account and confirm the dashboard loads.
4. Confirm Redis-backed flows such as rate limiting and session-backed auth are working.

## Troubleshooting

- If Railway still reports `Dockerfile 'Dockerfile' does not exist`, the service is still pinned to Dockerfile mode in Railway settings.
- Do not reintroduce `output: 'standalone'` in the Next.js configs for this deployment path. The current Railway flow uses `next start`.
- Do not point Railway at the individual app folders as the service root. The repo root is required for workspace dependency resolution.
