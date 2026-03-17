#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# atlas-migrate-all-tenants.sh
#
# Apply pending Atlas tenant migrations to EVERY active tenant database.
# Reads database URLs directly from the master DB — no hard-coded lists.
#
# Usage:
#   MASTER_DB_URL="<url>" ./scripts/atlas-migrate-all-tenants.sh
#   # or source your .env first:
#   set -a; source .env; set +a; ./scripts/atlas-migrate-all-tenants.sh
#
# Prerequisites:
#   • atlas CLI installed and on PATH
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
MIGRATIONS_DIR="file://$PROJECT_ROOT/atlas/tenant"

echo "🔍  Querying active tenant databases from master DB …"

# Fetch all active tenant database URLs (one per line, trimmed)
URLS=$(
  psql "$MASTER_DB_URL" \
    --tuples-only \
    --no-align \
    -c "SELECT database_url FROM tenants WHERE status = 'ACTIVE' AND database_url IS NOT NULL ORDER BY id;"
)

if [[ -z "$URLS" ]]; then
  echo "ℹ️   No active tenants found — nothing to migrate."
  exit 0
fi

TOTAL=$(echo "$URLS" | grep -c .)
DONE=0
FAILED=0

while IFS= read -r RAW_URL; do
  # Skip blank lines
  [[ -z "$RAW_URL" ]] && continue

  # Strip PgBouncer pooler suffix for direct DDL access
  DIRECT_URL="${RAW_URL//-pooler./. }"
  DIRECT_URL="${DIRECT_URL// /}"

  echo ""
  echo "──────────────────────────────────────────────────"
  DONE=$(( DONE + 1 ))
  echo "[$DONE/$TOTAL] Migrating: ${DIRECT_URL%%@*}@…"

  if atlas migrate apply \
       --dir   "$MIGRATIONS_DIR" \
       --url   "$DIRECT_URL" \
       --allow-dirty; then
    echo "  ✅  Done"
  else
    echo "  ❌  Failed — continuing with remaining tenants"
    FAILED=$(( FAILED + 1 ))
  fi
done <<< "$URLS"

echo ""
echo "══════════════════════════════════════════════════"
echo "Migration summary: $DONE processed, $FAILED failed."

if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
