-- Atlas auto-generated migration — DO NOT EDIT
-- Generated from: atlas/tenant/schema.sql
-- Run: atlas migrate diff initial --env tenant
-- Apply to a tenant: atlas migrate apply --url "$TENANT_DB_URL" --dir "file://atlas/tenant"

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

CREATE TABLE "customers" (
  "id"         serial      NOT NULL,
  "name"       text        NOT NULL,
  "email"      text        NOT NULL,
  "phone"      text,
  "company"    text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE ("email")
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
