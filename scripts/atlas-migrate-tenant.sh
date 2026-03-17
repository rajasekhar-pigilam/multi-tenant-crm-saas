#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# atlas-migrate-tenant.sh
#
# Apply pending Atlas tenant migrations to a single tenant database.
#
# Usage:
#   ./scripts/atlas-migrate-tenant.sh <tenant-database-url>
#
# Examples:
#   ./scripts/atlas-migrate-tenant.sh "$TENANT_ABC_DB_URL"
#   ./scripts/atlas-migrate-tenant.sh "postgres://user:pass@host/db?sslmode=require"
#
# The script uses the unpooled (direct) Neon endpoint so that DDL runs without
# PgBouncer transaction-mode restrictions.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

TENANT_URL="${1:-}"
if [[ -z "$TENANT_URL" ]]; then
  echo "Usage: $0 <tenant-database-url>" >&2
  exit 1
fi

# Strip PgBouncer pooler from host so DDL can run
DIRECT_URL="${TENANT_URL//-pooler./. }"
# Re-collapse the accidental space introduced by bash substitution
DIRECT_URL="${DIRECT_URL// /}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="file://$PROJECT_ROOT/atlas/tenant"

echo "🔄  Applying Atlas tenant migrations …"
echo "    Dir : $MIGRATIONS_DIR"
echo "    DB  : ${DIRECT_URL%%@*}@…"

atlas migrate apply \
  --dir   "$MIGRATIONS_DIR" \
  --url   "$DIRECT_URL" \
  --allow-dirty

echo "✅  Tenant migrations applied."
