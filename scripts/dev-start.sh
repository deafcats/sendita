#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev-start.sh  –  Start the full local dev environment
# Usage: ./scripts/dev-start.sh [--no-migrate] [--test]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NO_MIGRATE=false
RUN_TESTS=false
for arg in "$@"; do
  case "$arg" in
    --no-migrate) NO_MIGRATE=true ;;
    --test)       RUN_TESTS=true ;;
  esac
done

echo "▶ Starting Docker infrastructure (Postgres + Redis)…"
docker compose up -d
echo "  Waiting for services to be healthy…"
timeout 30 bash -c 'until docker compose exec postgres pg_isready -U anon -d anon_inbox -q 2>/dev/null; do sleep 1; done'
timeout 10 bash -c 'until docker compose exec redis redis-cli ping -q 2>/dev/null | grep -q PONG; do sleep 1; done'
echo "  ✓ Postgres and Redis are up"

# Copy root .env.local to each Next.js app (idempotent)
cp .env.local apps/api/.env.local
cp .env.local apps/web/.env.local
cp .env.local apps/admin/.env.local

if [ "$NO_MIGRATE" = "false" ]; then
  echo "▶ Running database migrations…"
  cd packages/db
  DATABASE_URL="$(grep '^DATABASE_URL=' "$ROOT/.env.local" | head -1 | cut -d= -f2-)" \
    pnpm drizzle-kit migrate
  cd "$ROOT"
  echo "  ✓ Migrations applied"

  echo "▶ Seeding engagement prompts…"
  DB_URL="$(grep '^DATABASE_URL=' "$ROOT/.env.local" | head -1 | cut -d= -f2-)"
  DB_PASS="$(echo "$DB_URL" | sed 's|.*://[^:]*:\([^@]*\)@.*|\1|')"
  DB_HOST="$(echo "$DB_URL" | sed 's|.*@\([^:]*\):\([0-9]*\)/.*|\1|')"
  DB_PORT="$(echo "$DB_URL" | sed 's|.*@[^:]*:\([0-9]*\)/.*|\1|')"
  DB_USER="$(echo "$DB_URL" | sed 's|.*://\([^:]*\):.*|\1|')"
  DB_NAME="$(echo "$DB_URL" | sed 's|.*/\([^?]*\).*|\1|')"
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -c "INSERT INTO engagement_prompts (id, body, category, is_active, usage_count)
        SELECT gen_random_uuid(), body, category, is_active, usage_count
        FROM (VALUES
          ('What''s something you''ve always wanted to tell me?', 'curiosity', true, 0),
          ('Rate my vibe honestly', 'rating', true, 0)
        ) AS t(body, category, is_active, usage_count)
        WHERE NOT EXISTS (SELECT 1 FROM engagement_prompts LIMIT 1);" 2>/dev/null || true
  echo "  ✓ Seed complete (or already seeded)"
fi

echo ""
echo "▶ Starting API (port 3001)…"
(cd apps/api && pnpm dev) &
API_PID=$!

echo "▶ Starting Web (port 3000)…"
(cd apps/web && pnpm dev) &
WEB_PID=$!

echo ""
echo "  Waiting for API to be ready…"
timeout 60 bash -c 'until curl -sf http://localhost:3001/api/health > /dev/null 2>&1; do sleep 2; done'
echo "  ✓ API is up at http://localhost:3001"
echo "  ✓ Web is up at http://localhost:3000"

if [ "$RUN_TESTS" = "true" ]; then
  echo ""
  echo "▶ Warming up routes…"
  curl -sf http://localhost:3001/api/health > /dev/null
  curl -sf -X POST http://localhost:3001/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"deviceSecret":"warmup00000000000000000000000000002","birthYear":2000}' > /dev/null 2>&1 || true
  sleep 3

  echo "▶ Running test suite…"
  cd tests
  DATABASE_URL="$(grep '^DATABASE_URL=' "$ROOT/.env.local" | head -1 | cut -d= -f2-)" \
  REDIS_URL="$(grep '^REDIS_URL=' "$ROOT/.env.local" | head -1 | cut -d= -f2-)" \
  API_URL="http://localhost:3001" \
    pnpm vitest run
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Services running:"
echo "    API   → http://localhost:3001/api/health"
echo "    Web   → http://localhost:3000/to/<slug>"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

trap "kill $API_PID $WEB_PID 2>/dev/null; docker compose stop" EXIT
wait
