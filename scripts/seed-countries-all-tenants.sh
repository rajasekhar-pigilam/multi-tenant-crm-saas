#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed-countries-all-tenants.sh
#
# Seeds the default countries list into EVERY active tenant database.
# Run this AFTER applying the 20260317000001_add_countries.sql migration via
# atlas-migrate-all-tenants.sh.
#
# Usage:
#   MASTER_DB_URL="<url>" ./scripts/seed-countries-all-tenants.sh
#   # or source your .env first:
#   set -a; source .env; set +a; ./scripts/seed-countries-all-tenants.sh
#
# Prerequisites:
#   • psql installed and on PATH
#   • MASTER_DB_URL env var set
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

MASTER_DB_URL="${MASTER_DB_URL:-}"
if [[ -z "$MASTER_DB_URL" ]]; then
  echo "Error: MASTER_DB_URL is not set." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SEED_FILE="$PROJECT_ROOT/backend/prisma/seeds/tenant-countries.sql"

if [[ ! -f "$SEED_FILE" ]]; then
  echo "Error: Seed file not found: $SEED_FILE" >&2
  exit 1
fi

echo "🔍  Querying active tenant databases from master DB …"

URLS=$(
  psql "$MASTER_DB_URL" \
    --tuples-only \
    --no-align \
    -c "SELECT database_url FROM tenants WHERE status = 'ACTIVE' AND database_url IS NOT NULL ORDER BY id;"
)

if [[ -z "$URLS" ]]; then
  echo "ℹ️   No active tenants found — nothing to seed."
  exit 0
fi

TOTAL=$(echo "$URLS" | grep -c .)
DONE=0
FAILED=0

while IFS= read -r RAW_URL; do
  [[ -z "$RAW_URL" ]] && continue

  DONE=$(( DONE + 1 ))
  echo ""
  echo "──────────────────────────────────────────────────"
  echo "[$DONE/$TOTAL] Seeding countries into: ${RAW_URL%%@*}@…"

  if psql "$RAW_URL" -f "$SEED_FILE" --quiet; then
    echo "  ✅  Done"
  else
    echo "  ❌  Failed — continuing with remaining tenants"
    FAILED=$(( FAILED + 1 ))
  fi
done <<< "$URLS"

echo ""
echo "══════════════════════════════════════════════════"
echo "Seed summary: $DONE processed, $FAILED failed."

if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
