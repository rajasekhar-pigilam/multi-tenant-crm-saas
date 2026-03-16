# Multi-Tenant CRM SaaS PoC

Production-grade proof of concept for a database-per-tenant CRM SaaS built with NestJS, Angular, Prisma, Atlas, JWT, and PostgreSQL/Neon.

## Documentation References

- Angular routing and guards: [angular.dev/guide/routing](https://angular.dev/guide/routing) and [angular.dev/guide/routing/route-guards](https://angular.dev/guide/routing/route-guards)
- Angular Material setup: [material.angular.dev/guide/getting-started](https://material.angular.dev/guide/getting-started)
- NestJS authentication: [docs.nestjs.com/security/authentication](https://docs.nestjs.com/security/authentication)
- NestJS Swagger: [docs.nestjs.com/recipes/swagger](https://docs.nestjs.com/recipes/swagger)
- Prisma schema overview: [prisma.io/docs/orm/prisma-schema/overview](https://www.prisma.io/docs/orm/prisma-schema/overview)
- Prisma ORM 7 upgrade guide: [prisma.io/docs/guides/upgrade-prisma-orm/v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- Atlas with Prisma: [atlasgo.io/guides/orms/prisma](https://atlasgo.io/guides/orms/prisma)
- Neon connection setup: [neon.com/docs/connect/connect-from-any-app](https://neon.com/docs/connect/connect-from-any-app)

## Technology Stack

- Frontend: Angular 21, Angular Material, RxJS, TypeScript
- Backend: NestJS 11, REST APIs, Swagger, JWT
- Database: PostgreSQL, Neon
- ORM: Prisma 7 with `@prisma/adapter-pg`
- Migrations: Atlas
- Multi-tenancy model: database-per-tenant isolation

## Architecture Overview

- Master database: `crm_master_db`
- Tenant databases: `crm_tenant_abc_db`, `crm_tenant_xyz_db`, `crm_tenant_demo_db`
- Master database stores users, tenants, and tenant memberships
- Tenant databases store CRM business data only
- Login is performed against the master database, then a tenant-scoped JWT is issued after workspace selection

```mermaid
flowchart TD
  AngularClient[AngularClient] --> LoginApi[POST_auth_login]
  LoginApi --> MasterDb[crm_master_db]
  MasterDb --> WorkspaceSelection[WorkspaceSelection]
  WorkspaceSelection --> SelectTenantApi[POST_auth_select_tenant]
  SelectTenantApi --> JwtToken[JWT_access_token]
  JwtToken --> NestApi[NestJS_API]
  NestApi --> JwtGuard[JWT_Guard]
  JwtGuard --> TenantConnectionService[TenantConnectionService]
  TenantConnectionService --> MasterLookup[Master_Tenant_Lookup]
  TenantConnectionService --> TenantDb[tenant_database]
```

## Folder Structure

```text
.
├── atlas.hcl
├── docker-compose.yml
├── package.json
├── tsconfig.base.json
├── backend
│   ├── atlas
│   │   ├── master
│   │   └── tenant
│   ├── nest-cli.json
│   ├── package.json
│   ├── prisma
│   │   ├── master
│   │   │   ├── prisma.config.ts
│   │   │   └── schema.prisma
│   │   ├── tenant
│   │   │   ├── prisma.config.ts
│   │   │   └── schema.prisma
│   │   └── seeds
│   │       ├── init-local-databases.sql
│   │       └── seed.ts
│   └── src
│       ├── app.module.ts
│       ├── main.ts
│       ├── common
│       ├── config
│       ├── database
│       ├── generated
│       └── modules
│           ├── activities
│           ├── auth
│           ├── customers
│           ├── deals
│           └── tenants
└── frontend
    ├── angular.json
    ├── package.json
    └── src
        ├── app
        │   ├── app.component.ts
        │   ├── app.config.ts
        │   ├── app.routes.ts
        │   ├── core
        │   ├── layouts
        │   ├── modules
        │   └── shared
        ├── environments
        ├── index.html
        ├── main.ts
        └── styles.css
```

## Backend Modules

- `auth`: login, workspace selection, JWT issuance
- `tenants`: dashboard summary endpoint
- `customers`: CRUD
- `deals`: create and list
- `activities`: create and list
- `database`: master Prisma client plus cached tenant Prisma clients
- `common`: guards, decorators, authenticated-user contract

## Frontend Modules

- `auth`: login form
- `workspace`: workspace selection screen
- `dashboard`: summary cards and activity tables
- `customers`: customer form and table
- `deals`: deal form and table
- `activities`: activity form and table
- `layouts`: auth shell and dashboard shell
- `core`: auth service, API services, interceptor, guard

## Database Schemas

### Master Database

- `User`
  - `id`
  - `email`
  - `passwordHash`
  - `status`
  - `createdAt`
- `Tenant`
  - `id`
  - `name`
  - `databaseUrl`
  - `status`
  - `createdAt`
- `TenantMember`
  - `id`
  - `userId`
  - `tenantId`
  - `role`

### Tenant Database

- `User`
  - `id`
  - `email`
  - `role`
  - `createdAt`
- `Customer`
  - `id`
  - `name`
  - `email`
  - `phone`
  - `company`
  - `createdAt`
- `Deal`
  - `id`
  - `title`
  - `value`
  - `stage`
  - `customerId`
  - `createdAt`
- `Activity`
  - `id`
  - `type`
  - `notes`
  - `customerId`
  - `createdAt`

## Authentication and Tenant Resolution

### Login Flow

1. User submits `email` and `password`
2. Backend validates the user against `crm_master_db`
3. Backend returns memberships and a short-lived `selectionToken`
4. Frontend renders workspace selection
5. Frontend calls `POST /auth/select-tenant`
6. Backend validates tenant membership and returns a tenant-scoped JWT

### Why `selectionToken` Exists

The original request only specified `tenantId` for workspace selection. This implementation adds a short-lived pre-selection JWT so `POST /auth/select-tenant` can stay simple and still be secure without sending `userId` back from the browser.

### JWT Payload

```json
{
  "sub": 1,
  "email": "raj@gmail.com",
  "tenantId": 1,
  "role": "ADMIN",
  "tokenType": "access"
}
```

## API Examples

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "raj@gmail.com",
    "password": "123456"
  }'
```

Example response:

```json
{
  "user": {
    "id": 1,
    "email": "raj@gmail.com",
    "status": "ACTIVE"
  },
  "tenants": [
    { "id": 1, "name": "ABC Corp", "role": "ADMIN" },
    { "id": 2, "name": "XYZ Ltd", "role": "MANAGER" }
  ],
  "selectionToken": "jwt-token"
}
```

### Select Tenant

```bash
curl -X POST http://localhost:3000/api/auth/select-tenant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <selection-token>" \
  -d '{
    "tenantId": 1
  }'
```

### Create Customer

```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{
    "name": "Acme Industries",
    "email": "buyer@acme.com",
    "phone": "+1-202-555-0111",
    "company": "Acme Corp"
  }'
```

### Swagger

- Swagger UI: `http://localhost:3000/api/docs`

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Create Local Environment File

```bash
cp .env.example .env
```

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

Note: Docker was available during implementation, but the Docker daemon was not running, so the container startup could not be completed in-session.

### 4. Generate Prisma Clients

```bash
npm run prisma:generate
```

### 5. Apply Schemas for Quick Local Bootstrap

For local smoke testing, use Prisma `db push` to create tables:

```bash
cd backend
npx prisma db push --config prisma/master/prisma.config.ts
TENANT_DEMO_DB_URL="postgresql://postgres:postgres@localhost:5432/crm_tenant_abc_db?schema=public" npx prisma db push --config prisma/tenant/prisma.config.ts
TENANT_DEMO_DB_URL="postgresql://postgres:postgres@localhost:5432/crm_tenant_xyz_db?schema=public" npx prisma db push --config prisma/tenant/prisma.config.ts
TENANT_DEMO_DB_URL="postgresql://postgres:postgres@localhost:5432/crm_tenant_demo_db?schema=public" npx prisma db push --config prisma/tenant/prisma.config.ts
```

### 6. Seed Demo Data

```bash
npm run prisma:seed --workspace backend
```

Seeded demo users:

- `raj@gmail.com / 123456`
- `john@yahoo.com / 123456`

### 7. Start Applications

```bash
npm run dev:backend
npm run dev:frontend
```

Frontend default URL: `http://localhost:4200`

Backend default URL: `http://localhost:3000/api`

## Atlas Migration Setup

Atlas is configured through the root `atlas.hcl` plus separate Prisma configs and migration directories:

- Master migration directory: `backend/atlas/master`
- Tenant migration directory: `backend/atlas/tenant`

### Master DB Migration Flow

```bash
atlas migrate diff master_init --env master
atlas migrate apply --env master
```

### Tenant DB Migration Flow

Apply the same tenant schema to each tenant database URL:

```bash
TENANT_DEMO_DB_URL="postgresql://.../crm_tenant_abc_db?schema=public" atlas migrate diff tenant_init --env tenant
TENANT_DEMO_DB_URL="postgresql://.../crm_tenant_abc_db?schema=public" atlas migrate apply --env tenant

TENANT_DEMO_DB_URL="postgresql://.../crm_tenant_xyz_db?schema=public" atlas migrate apply --env tenant
TENANT_DEMO_DB_URL="postgresql://.../crm_tenant_demo_db?schema=public" atlas migrate apply --env tenant
```

### Recommended Production Workflow

1. Apply Atlas migrations to `crm_master_db`
2. Provision the new tenant database in Neon
3. Apply the tenant Atlas migration set to that tenant database
4. Insert the new tenant row into the master database with the tenant DB URL

## Neon Setup

### Create the Neon Project

1. Create one Neon project for the CRM SaaS platform
2. Create or branch databases for:
   - `crm_master_db`
   - `crm_tenant_abc_db`
   - `crm_tenant_xyz_db`
   - `crm_tenant_demo_db`
3. Copy pooled or direct PostgreSQL connection strings from the Neon console

### Environment Variables

```env
MASTER_DB_URL=postgresql://.../crm_master_db?sslmode=require
TENANT_ABC_DB_URL=postgresql://.../crm_tenant_abc_db?sslmode=require
TENANT_XYZ_DB_URL=postgresql://.../crm_tenant_xyz_db?sslmode=require
TENANT_DEMO_DB_URL=postgresql://.../crm_tenant_demo_db?sslmode=require
NEON_API_KEY=your-neon-api-key
TENANT_DB_TEMPLATE=crm_tenant_{slug}_db
JWT_SECRET=strong-random-secret
```

## Security Considerations

- Passwords are hashed with `bcrypt`
- JWT guards protect tenant APIs
- Role-based authorization is enforced with `RolesGuard`
- Tenant isolation is enforced by creating the Prisma client against the selected tenant database only
- Master DB and tenant DB models are physically separated

## Performance Considerations

- Master Prisma client is created once and reused
- Tenant Prisma clients are cached in `TenantConnectionService`
- Prisma 7 uses `@prisma/adapter-pg`, so pooling behavior follows `pg`
- Database-per-tenant isolation supports horizontal scaling and noisy-neighbor containment

## Build and Verification

The repository currently passes:

```bash
npm run prisma:generate
npm run build --workspace backend
npm run build --workspace frontend
npm run lint
```

## Deployment Notes

### Backend

- Deploy NestJS as a long-running Node service
- Set `MASTER_DB_URL`, `JWT_SECRET`, and the Neon tenant URLs
- Run Atlas migrations before promoting the release

### Frontend

- Build Angular with `npm run build --workspace frontend`
- Serve the static bundle from Nginx, Vercel, Netlify, or a CDN-backed object store
- Point the frontend API base URL at the deployed NestJS API

### Database Operations

- Treat master DB migrations separately from tenant DB migrations
- Apply tenant migrations to every existing tenant database during rollout
- Ensure tenant DB creation automation always follows migration application before activation