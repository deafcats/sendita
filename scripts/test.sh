#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# test.sh  –  Run the full test suite against a running local environment
# Requires: API running on localhost:3001, Postgres on 5433, Redis on 6379
# Usage: ./scripts/test.sh [--unit] [--integration] [--security] [--race] [--edge]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/tests"

DB_URL="postgresql://anon:anon_dev_pass@localhost:5433/anon_inbox"
REDIS="redis://localhost:6379"
API="http://localhost:3001"

echo "▶ Checking prerequisites…"
if ! curl -sf "$API/api/health" > /dev/null 2>&1; then
  echo "  ✗ API not reachable at $API — start it with ./scripts/dev-start.sh first"
  exit 1
fi
echo "  ✓ API is reachable"

# Warm up key routes to reduce first-hit latency in dev mode
echo "▶ Warming up API routes…"
curl -sf "$API/api/health" > /dev/null
curl -sf "$API/api/links/warmup" > /dev/null 2>&1 || true
sleep 2
echo "  ✓ Routes warmed"

echo ""
echo "▶ Running test suite…"
DATABASE_URL="$DB_URL" REDIS_URL="$REDIS" API_URL="$API" \
  pnpm vitest run "$@"
