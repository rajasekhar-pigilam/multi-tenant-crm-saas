import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

/**
 * Applies the tenant database schema to a fresh PostgreSQL database
 * using raw DDL, mirroring backend/prisma/tenant/schema.prisma exactly.
 *
 * Using raw DDL avoids a subprocess dependency on the Prisma CLI and
 * allows atomic schema initialisation inside the provisioning transaction.
 */
@Injectable()
export class TenantSchemaInitializerService {
  private readonly logger = new Logger(TenantSchemaInitializerService.name);

  async applySchema(connectionString: string): Promise<void> {
    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10_000,
      ssl: { rejectUnauthorized: false }
    });

    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        await client.query(`
          DO $$ BEGIN
            CREATE TYPE "TenantUserRole" AS ENUM ('ADMIN', 'MANAGER', 'MEMBER');
          EXCEPTION WHEN duplicate_object THEN NULL;
          END $$;
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS "users" (
            "id"         SERIAL       NOT NULL,
            "email"      TEXT         NOT NULL,
            "role"       "TenantUserRole" NOT NULL DEFAULT 'MEMBER',
            "created_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            CONSTRAINT "users_pkey"       PRIMARY KEY ("id"),
            CONSTRAINT "users_email_key"  UNIQUE ("email")
          );
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS "customers" (
            "id"         SERIAL      NOT NULL,
            "name"       TEXT        NOT NULL,
            "email"      TEXT        NOT NULL,
            "phone"      TEXT,
            "company"    TEXT,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT "customers_pkey"       PRIMARY KEY ("id"),
            CONSTRAINT "customers_email_key"  UNIQUE ("email")
          );
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS "deals" (
            "id"          SERIAL         NOT NULL,
            "title"       TEXT           NOT NULL,
            "value"       DECIMAL(12, 2) NOT NULL,
            "stage"       TEXT           NOT NULL,
            "customer_id" INTEGER        NOT NULL,
            "created_at"  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
            CONSTRAINT "deals_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "deals_customer_id_fkey"
              FOREIGN KEY ("customer_id")
              REFERENCES "customers"("id")
              ON DELETE CASCADE
          );
        `);

        await client.query(`
          CREATE TABLE IF NOT EXISTS "activities" (
            "id"          SERIAL      NOT NULL,
            "type"        TEXT        NOT NULL,
            "notes"       TEXT,
            "customer_id" INTEGER     NOT NULL,
            "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT "activities_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "activities_customer_id_fkey"
              FOREIGN KEY ("customer_id")
              REFERENCES "customers"("id")
              ON DELETE CASCADE
          );
        `);

        await client.query('COMMIT');
        this.logger.log('Tenant schema applied successfully');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } finally {
      await pool.end();
    }
  }
}
