-- Seed: default countries list for existing tenant databases
-- Applied AFTER the 20260317000001_add_countries.sql migration DDL.
-- For new tenants the same data is embedded in the init migration.
--
-- Usage:
--   psql "$TENANT_DEMO_DB_URL"  -f backend/prisma/seeds/tenant-countries.sql
--   psql "$TENANT_ABC_DB_URL"   -f backend/prisma/seeds/tenant-countries.sql
-- OR bulk:
--   ./scripts/seed-countries-all-tenants.sh

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
