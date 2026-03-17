# Atlas configuration — https://atlasgo.io/atlas-schema/hcl
#
# Rules:
#  • atlas/master/schema.sql  is the source of truth for crm_master_db
#  • atlas/tenant/schema.sql  is the source of truth for every tenant database
#  • Prisma is used ONLY for ORM queries — never for schema management
#
# Common commands (run from project root):
#   atlas migrate diff --env master          # diff schema.sql vs current master DB
#   atlas migrate apply --env master         # apply master migrations
#   atlas migrate diff --env tenant          # diff schema.sql vs demo tenant DB
#   atlas migrate apply --env tenant         # apply tenant migrations to demo DB
#   atlas schema inspect --env master        # inspect current master schema
#   atlas migrate status --env master        # pending migration status

# ── Master database ───────────────────────────────────────────────────────────
env "master" {
  # Desired state — edit schema.sql, then run `atlas migrate diff --env master`
  src = "file://atlas/master/schema.sql"

  # Scratch DB Atlas uses internally to normalise SQL and compute diffs.
  # Use a dedicated Neon dev branch or docker://postgres/16/dev for local Docker.
  dev = getenv("ATLAS_DEV_DB_URL")

  # Target: the production master database
  url = getenv("MASTER_DB_URL")

  migration {
    dir    = "file://atlas/master"
    format = atlas
  }
}

# ── Tenant databases ──────────────────────────────────────────────────────────
# `url` points to the demo DB for diff/inspect operations.
# For per-tenant apply, pass --url flag explicitly or use atlas-migrate-tenant.sh.
env "tenant" {
  # Desired state — same schema applies to EVERY tenant database
  src = "file://atlas/tenant/schema.sql"

  dev = getenv("ATLAS_DEV_DB_URL")

  # Default target for diff/inspect — swap to any tenant DB with --url
  url = getenv("TENANT_DEMO_DB_URL")

  migration {
    dir    = "file://atlas/tenant"
    format = atlas
  }
}

# ── Neon dev branch (optional, for safe migration testing) ────────────────────
# Create a branch in the Neon Console, get its URL, set NEON_DEV_BRANCH_URL.
# atlas migrate apply --env neon-dev --env master
env "neon-dev" {
  src = "file://atlas/master/schema.sql"
  dev = getenv("ATLAS_DEV_DB_URL")
  url = getenv("NEON_DEV_BRANCH_URL")

  migration {
    dir    = "file://atlas/master"
    format = atlas
  }
}
