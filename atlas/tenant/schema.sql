-- ============================================================
-- Atlas source-of-truth schema for: crm_tenant_*_db
-- ============================================================
-- This SAME schema is applied to EVERY tenant database.
-- Edit this file, then run:
--   atlas migrate diff <name> --env tenant
-- Apply to ALL tenants after merging:
--   ./scripts/atlas-migrate-all-tenants.sh
-- ============================================================

-- ── Enum types ───────────────────────────────────────────────

CREATE TYPE "TenantUserRole" AS ENUM (
  'ADMIN',
  'MANAGER',
  'MEMBER'
);

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE "users" (
  "id"         serial           NOT NULL,
  "email"      text             NOT NULL,
  "role"       "TenantUserRole" NOT NULL DEFAULT 'MEMBER',
  "created_at" timestamptz      NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE ("email")
);

-- Per-tenant countries lookup.
-- Seeded with a default list at provisioning time.
-- Tenant admins can toggle is_active to control which countries
-- appear in the Add Customer form.
CREATE TABLE "countries" (
  "id"        serial  NOT NULL,
  "code"      char(2) NOT NULL,
  "name"      text    NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  PRIMARY KEY ("id"),
  UNIQUE ("code")
);

CREATE TABLE "customers" (
  "id"           serial      NOT NULL,
  "name"         text        NOT NULL,
  "email"        text        NOT NULL,
  "phone"        text,
  "company"      text,
  "country_code" char(2),
  "created_at"   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE ("email"),
  CONSTRAINT "customers_country_code_fkey"
    FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE SET NULL
);

CREATE TABLE "deals" (
  "id"          serial        NOT NULL,
  "title"       text          NOT NULL,
  "value"       numeric(12,2) NOT NULL,
  "stage"       text          NOT NULL,
  "customer_id" integer       NOT NULL,
  "created_at"  timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "deals_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE
);

CREATE TABLE "activities" (
  "id"          serial      NOT NULL,
  "type"        text        NOT NULL,
  "notes"       text,
  "customer_id" integer     NOT NULL,
  "created_at"  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "activities_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE
);
