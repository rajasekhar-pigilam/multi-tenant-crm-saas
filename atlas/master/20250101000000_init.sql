-- Atlas auto-generated migration — DO NOT EDIT
-- Generated from: atlas/master/schema.sql
-- Run: atlas migrate diff initial --env master
-- Apply: atlas migrate apply --env master

-- ── Enum types ───────────────────────────────────────────────

CREATE TYPE "UserStatus" AS ENUM (
  'ACTIVE',
  'INVITED',
  'DISABLED'
);

CREATE TYPE "TenantStatus" AS ENUM (
  'PROVISIONING',
  'ACTIVE',
  'FAILED',
  'SUSPENDED',
  'ARCHIVED'
);

CREATE TYPE "MembershipRole" AS ENUM (
  'ADMIN',
  'MANAGER',
  'MEMBER'
);

-- ── Tables ───────────────────────────────────────────────────

CREATE TABLE "users" (
  "id"            serial        NOT NULL,
  "email"         text          NOT NULL,
  "password_hash" text          NOT NULL,
  "status"        "UserStatus"  NOT NULL DEFAULT 'ACTIVE',
  "created_at"    timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE ("email")
);

CREATE TABLE "tenants" (
  "id"           serial         NOT NULL,
  "name"         text           NOT NULL,
  "slug"         text           NOT NULL,
  "database_url" text,
  "status"       "TenantStatus" NOT NULL DEFAULT 'PROVISIONING',
  "created_at"   timestamptz    NOT NULL DEFAULT now(),
  "updated_at"   timestamptz    NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  UNIQUE ("slug"),
  UNIQUE ("database_url")
);

CREATE TABLE "tenant_members" (
  "id"        serial           NOT NULL,
  "user_id"   integer          NOT NULL,
  "tenant_id" integer          NOT NULL,
  "role"      "MembershipRole" NOT NULL DEFAULT 'MEMBER',
  PRIMARY KEY ("id"),
  UNIQUE ("user_id", "tenant_id"),
  CONSTRAINT "tenant_members_user_id_fkey"
    FOREIGN KEY ("user_id")   REFERENCES "users"("id")   ON DELETE CASCADE,
  CONSTRAINT "tenant_members_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);

CREATE TABLE "provisioning_logs" (
  "id"         serial      NOT NULL,
  "tenant_id"  integer     NOT NULL,
  "step"       text        NOT NULL,
  "status"     text        NOT NULL,
  "message"    text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "provisioning_logs_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
);
