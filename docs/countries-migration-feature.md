# Countries Per-Tenant Migration Feature

## Overview

Add a per-tenant `countries` reference table to every tenant database.  
Each tenant can independently enable or disable countries through an admin UI.  
The `customers` table gains a nullable `country_code` FK column so every customer record can optionally be associated with a country.

---

## Architecture Decision

### Why countries live in the tenant DB (not master DB)

The platform uses **database-per-tenant isolation**. Tenant databases cannot have foreign keys that point to the master database — they are entirely separate PostgreSQL databases managed by Neon.

| Option | Where | FK integrity | Tenant control |
|--------|-------|-------------|----------------|
| Global list in master DB | `crm_master_db` | No (cross-DB FK impossible) | None — shared list |
| **Per-tenant list in tenant DB** | `crm_tenant_*_db` | Yes (same DB) | Full — each tenant enables/disables |

The per-tenant approach is used. Each tenant gets a full countries list seeded at provisioning time with all countries enabled by default. Tenant admins can then disable irrelevant countries so their sales team only sees the markets they operate in.

---

## Data Model

### Tenant DB schema changes

```
countries table (NEW)
─────────────────────
id         serial     PK
code       char(2)    UNIQUE  e.g. 'US', 'IN', 'GB'
name       text               e.g. 'United States', 'India'
is_active  boolean    DEFAULT true

customers table (MODIFIED)
──────────────────────────
... existing columns ...
country_code  char(2)  NULL  FK → countries.code ON DELETE SET NULL
```

### Relationship

```
countries (1) ────── (0..many) customers
  code ──────────────── country_code
```

- `country_code` is **nullable** — existing customer records are unaffected.
- `ON DELETE SET NULL` — if a country row is ever deleted, existing customer records keep their data (no accidental data loss).
- Disabling a country (`is_active = false`) does **not** delete it or break existing FK references; the entry remains in the database.

---

## Migration Workflow (Atlas)

This section documents the full Atlas migration workflow used to introduce this feature.

### Neon Branching Strategy

```
Production DB (main branch)
    └── Dev/Test Branch (Neon Console → Branches → Create Branch)
            ↓ test migration here first
            ↓ if OK, apply to production
```

Set `NEON_DEV_BRANCH_URL` in `.env` for `atlas migrate apply --env neon-dev` tests.

---

### Step 1 — Edit the tenant schema (source of truth)

File: `atlas/tenant/schema.sql`

Add the `countries` table and the `country_code` column + FK to `customers`.  
**This file is the single source of truth. Never edit migration SQL files directly.**

```sql
CREATE TABLE "countries" (
  "id"        serial  NOT NULL,
  "code"      char(2) NOT NULL,
  "name"      text    NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  PRIMARY KEY ("id"),
  UNIQUE ("code")
);

-- in customers table, add:
"country_code" char(2),
CONSTRAINT "customers_country_code_fkey"
  FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE SET NULL
```

---

### Step 2 — Generate the migration for existing tenants

```bash
atlas migrate diff add_countries --env tenant
```

Atlas compares `atlas/tenant/schema.sql` (desired state) against the demo tenant DB (current state) and generates a migration file with only the **diff**:

```
atlas/tenant/20260317000001_add_countries.sql
```

Contents (DDL only — no seed data):
```sql
CREATE TABLE "countries" (...);
ALTER TABLE "customers" ADD COLUMN "country_code" char(2);
ALTER TABLE "customers" ADD CONSTRAINT "customers_country_code_fkey"
  FOREIGN KEY ("country_code") REFERENCES "countries"("code") ON DELETE SET NULL;
```

---

### Step 3 — Test on Neon dev branch

```bash
atlas migrate apply --env neon-dev   # safe test — does not touch production
```

Review the branch in the Neon Console to confirm the schema looks correct.

---

### Step 4 — Apply to demo tenant DB

```bash
atlas migrate apply --env tenant
```

---

### Step 5 — Seed countries data into demo DB

The migration only applies schema changes (DDL). Data (DML) is seeded separately:

```bash
psql "$TENANT_DEMO_DB_URL" -f backend/prisma/seeds/tenant-countries.sql
```

---

### Step 6 — Roll out DDL to all active tenants

```bash
./scripts/atlas-migrate-all-tenants.sh
```

This script reads every `database_url` from `crm_master_db.tenants` where `status = 'ACTIVE'`  
and runs `atlas migrate apply` against each one.

---

### Step 7 — Seed countries into all active tenants

```bash
./scripts/seed-countries-all-tenants.sh
```

---

### Step 8 — Update the initial migration for future tenants

`atlas/tenant/20250101000000_init.sql` is updated to include both:
1. The `countries` DDL
2. The full `INSERT` seed data

So every **new** tenant provisioned via `POST /api/tenants/register` automatically gets the full countries list from the very first `atlas migrate apply` — no extra seed step needed.

---

### Step 9 — Regenerate Prisma clients

```bash
npm run prisma:generate
# → regenerates backend/src/generated/tenant-client
```

---

### Step 10 — Regenerate Atlas checksums

```bash
npm run atlas:hash:tenant
```

The `atlas.sum` checksum file is updated whenever migration files change.

---

## npm Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run atlas:tenant:diff` | Generate migration from schema diff |
| `npm run atlas:tenant:apply` | Apply to demo tenant DB |
| `npm run atlas:tenant:status` | Show pending migrations |
| `npm run atlas:tenant:apply-all` | Apply to all active tenants |
| `npm run atlas:hash:tenant` | Regenerate atlas.sum checksum |

---

## API Endpoints

### Countries

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/countries` | Any JWT (access token) | List all countries for the tenant |
| `GET` | `/api/countries/active` | Any JWT | List only active countries |
| `PATCH` | `/api/countries/:code/toggle` | ADMIN role | Toggle is_active for a country |

### Customers (modified)

| Method | Path | Auth | Change |
|--------|------|------|--------|
| `POST` | `/api/customers` | ADMIN, MANAGER | Now accepts optional `countryCode` |
| `PUT` | `/api/customers/:id` | ADMIN, MANAGER | Now accepts optional `countryCode` |

---

## Backend Module: CountriesModule

```
backend/src/modules/countries/
├── countries.controller.ts   GET /countries, GET /countries/active, PATCH /countries/:code/toggle
├── countries.service.ts      findAll(), findActive(), toggle()
└── countries.module.ts
```

All methods are tenant-scoped — they resolve the tenant Prisma client from the JWT `tenantId`.

---

## Frontend Changes

### New service

`frontend/src/app/core/services/countries.service.ts`
- `list()` — `GET /api/countries`
- `listActive()` — `GET /api/countries/active`
- `toggle(code)` — `PATCH /api/countries/:code/toggle`

### Updated models (`crm.models.ts`)

```typescript
export interface Country {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

// Customer now has:
countryCode?: string;
country?: Country;
```

### Customers page changes

**For all users:**
- Country select dropdown in the Add Customer form (shows active countries only)
- Country name column in the customers table

**For ADMIN users only:**
- "Manage Countries" tab — lists all countries with a slide-toggle per row to enable/disable

---

## Provisioning Flow (new tenants)

```
POST /api/tenants/register
  → NeonProvisioningService.createTenantDatabase(slug)
  → TenantSchemaInitializerService.applySchema(url)
       → atlas migrate apply  (reads atlas/tenant/20250101000000_init.sql)
            → CREATE TABLE countries  ← includes DDL
            → INSERT INTO countries   ← includes seed data
            → CREATE TABLE customers  (now includes country_code column + FK)
  → Tenant marked ACTIVE
```

No extra provisioning step is needed for countries in new tenants.

---

## Rollback Plan

If the migration needs to be rolled back:

```sql
-- Remove FK and column from customers
ALTER TABLE "customers" DROP CONSTRAINT IF EXISTS "customers_country_code_fkey";
ALTER TABLE "customers" DROP COLUMN IF EXISTS "country_code";

-- Remove countries table
DROP TABLE IF EXISTS "countries";
```

Run this manually against each affected tenant DB.  
Atlas does not auto-generate rollback scripts — rollbacks are explicit.

---

## Files Changed

| File | Change type | Description |
|------|-------------|-------------|
| `atlas/tenant/schema.sql` | Modified | Add countries table + country_code FK |
| `atlas/tenant/20250101000000_init.sql` | Modified | Add countries DDL + seed INSERTs |
| `atlas/tenant/20260317000001_add_countries.sql` | New | Migration for existing tenants |
| `backend/prisma/seeds/tenant-countries.sql` | New | Country INSERT statements |
| `backend/prisma/tenant/schema.prisma` | Modified | Country model + countryCode on Customer |
| `scripts/seed-countries-all-tenants.sh` | New | Bulk seed helper script |
| `backend/src/modules/countries/` | New | CountriesModule (3 files) |
| `backend/src/app.module.ts` | Modified | Register CountriesModule |
| `backend/src/modules/customers/dto/create-customer.dto.ts` | Modified | Add countryCode field |
| `frontend/src/app/core/services/countries.service.ts` | New | Countries HTTP service |
| `frontend/src/app/shared/models/crm.models.ts` | Modified | Country interface + Customer update |
| `frontend/src/app/modules/customers/customers.component.ts` | Modified | Country select + admin tab |
