-- Atlas migration for EXISTING tenant databases
-- Adds per-tenant countries lookup table and country_code FK on customers.
--
-- Apply to all active tenants:
--   atlas migrate apply --env tenant            (demo DB)
--   ./scripts/atlas-migrate-all-tenants.sh      (all tenants)
--
-- After DDL is applied, seed the data:
--   psql "$TENANT_DEMO_DB_URL" -f backend/prisma/seeds/tenant-countries.sql
--   ./scripts/seed-countries-all-tenants.sh

CREATE TABLE "countries" (
  "id"        serial  NOT NULL,
  "code"      char(2) NOT NULL,
  "name"      text    NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  PRIMARY KEY ("id"),
  UNIQUE ("code")
);

ALTER TABLE "customers"
  ADD COLUMN "country_code" char(2),
  ADD CONSTRAINT "customers_country_code_fkey"
    FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE SET NULL;
