-- Atlas auto-generated migration — DO NOT EDIT
-- Generated from: atlas/tenant/schema.sql
-- Applied to new tenants at provisioning time via TenantSchemaInitializerService

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

-- ── Seed: default countries list ─────────────────────────────
-- All countries enabled by default. Tenant admins can disable
-- irrelevant ones via PATCH /api/countries/:code/toggle.

INSERT INTO "countries" ("code", "name") VALUES
  ('AF', 'Afghanistan'),
  ('AU', 'Australia'),
  ('AT', 'Austria'),
  ('BE', 'Belgium'),
  ('BR', 'Brazil'),
  ('CA', 'Canada'),
  ('CL', 'Chile'),
  ('CN', 'China'),
  ('CO', 'Colombia'),
  ('CZ', 'Czech Republic'),
  ('DK', 'Denmark'),
  ('EG', 'Egypt'),
  ('FI', 'Finland'),
  ('FR', 'France'),
  ('DE', 'Germany'),
  ('GH', 'Ghana'),
  ('GR', 'Greece'),
  ('HK', 'Hong Kong'),
  ('HU', 'Hungary'),
  ('IN', 'India'),
  ('ID', 'Indonesia'),
  ('IE', 'Ireland'),
  ('IL', 'Israel'),
  ('IT', 'Italy'),
  ('JP', 'Japan'),
  ('KE', 'Kenya'),
  ('MY', 'Malaysia'),
  ('MX', 'Mexico'),
  ('NL', 'Netherlands'),
  ('NZ', 'New Zealand'),
  ('NG', 'Nigeria'),
  ('NO', 'Norway'),
  ('PK', 'Pakistan'),
  ('PH', 'Philippines'),
  ('PL', 'Poland'),
  ('PT', 'Portugal'),
  ('RO', 'Romania'),
  ('RU', 'Russia'),
  ('SA', 'Saudi Arabia'),
  ('SG', 'Singapore'),
  ('ZA', 'South Africa'),
  ('KR', 'South Korea'),
  ('ES', 'Spain'),
  ('SE', 'Sweden'),
  ('CH', 'Switzerland'),
  ('TW', 'Taiwan'),
  ('TH', 'Thailand'),
  ('TR', 'Turkey'),
  ('AE', 'United Arab Emirates'),
  ('GB', 'United Kingdom'),
  ('US', 'United States'),
  ('VN', 'Vietnam')
ON CONFLICT ("code") DO NOTHING;
