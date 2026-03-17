import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

/**
 * Applies the tenant schema migrations to a freshly provisioned Neon database
 * using the Atlas CLI — Atlas is the single source of truth for all DDL.
 *
 * Migration files live in atlas/tenant/ and are managed exclusively by Atlas.
 * No DDL is embedded in application code.
 *
 * Binary resolution order:
 *   1. Bundled atlas binary co-located with this module (Vercel Lambda)
 *   2. atlas on the system PATH (local dev / CI)
 *
 * Neon databases take a few seconds to become reachable after creation so we
 * wait for a successful TCP connection before invoking Atlas (max 6 attempts
 * with exponential back-off).  DDL is sent via the direct (unpooled) endpoint
 * so that PgBouncer transaction-mode restrictions are never hit.
 */
@Injectable()
export class TenantSchemaInitializerService {
  private readonly logger = new Logger(TenantSchemaInitializerService.name);

  async applySchema(connectionString: string): Promise<void> {
    // Atlas requires the direct (unpooled) endpoint for DDL
    const directUrl = connectionString.replace('-pooler.', '.');

    const maxAttempts = 6;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.waitForDatabase(directUrl);
        this.runAtlasMigrations(directUrl);
        this.logger.log('Atlas tenant migrations applied successfully');
        return;
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isNotReady =
          msg.includes('does not exist') ||
          msg.includes('ECONNREFUSED') ||
          msg.includes('ETIMEDOUT') ||
          msg.includes('connection refused') ||
          msg.includes('could not connect');

        if (isNotReady && attempt < maxAttempts) {
          const delayMs = attempt * 3_000;
          this.logger.warn(
            `Database not ready (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs / 1000}s…`
          );
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        break;
      }
    }

    throw new InternalServerErrorException(
      `Atlas migration failed after ${maxAttempts} attempts: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Probe the database with a cheap SELECT 1 to confirm it is accepting
   * connections before handing off to Atlas.
   */
  private async waitForDatabase(connectionString: string): Promise<void> {
    const pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 10_000,
      max: 1,
      ssl: { rejectUnauthorized: false }
    });
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
    } finally {
      await pool.end();
    }
  }

  /**
   * Execute `atlas migrate apply` against the given database URL.
   * Atlas reads migrations from atlas/tenant/ (committed to the repo).
   */
  private runAtlasMigrations(connectionString: string): void {
    const atlasBin = this.resolveAtlasBinary();
    const migrationsDir = this.resolveMigrationsDir();

    this.logger.debug(`Atlas binary: ${atlasBin}`);
    this.logger.debug(`Migrations dir: ${migrationsDir}`);

    execFileSync(
      atlasBin,
      [
        'migrate', 'apply',
        '--dir',    `file://${migrationsDir}`,
        '--url',    connectionString,
        '--allow-dirty'    // safe on a brand-new empty database
      ],
      {
        stdio: 'pipe',    // capture output; errors surface via thrown exception
        timeout: 60_000
      }
    );
  }

  /**
   * Locate the Atlas CLI binary.
   *
   * When deployed as a Vercel Lambda the binary is bundled alongside the
   * function code (added by scripts/prepare-vercel-output.js).
   * In local dev / CI the binary must be installed and on PATH.
   */
  private resolveAtlasBinary(): string {
    // 1. Bundled binary (Lambda: sits next to index.js in the function dir)
    const bundled = path.join(__dirname, 'atlas');
    if (fs.existsSync(bundled)) {
      return bundled;
    }

    // 2. PATH-based binary (local dev / CI)
    try {
      execFileSync('atlas', ['version'], { stdio: 'pipe', timeout: 5_000 });
      return 'atlas';
    } catch {
      throw new Error(
        'Atlas CLI not found. ' +
        'Install from https://atlasgo.io/docs/getting-started/local-postgres#installation ' +
        'or ensure the binary is bundled with the Lambda (see scripts/prepare-vercel-output.js).'
      );
    }
  }

  /**
   * Resolve the absolute path of the atlas/tenant migration directory.
   *
   * Priority:
   *   1. Bundled migrations inside the Lambda function directory
   *   2. Project-root-relative path (local dev / CI / Docker)
   */
  private resolveMigrationsDir(): string {
    // Lambda: migrations were copied to <func-dir>/atlas/tenant/ by the build script
    const bundled = path.join(__dirname, 'atlas', 'tenant');
    if (fs.existsSync(bundled)) {
      return bundled;
    }

    // Local dev: resolve from CWD (project root)
    const fromCwd = path.resolve(process.cwd(), 'atlas', 'tenant');
    if (fs.existsSync(fromCwd)) {
      return fromCwd;
    }

    // Fallback: walk up from this file toward project root
    const fromModule = path.resolve(__dirname, '..', '..', '..', '..', '..', 'atlas', 'tenant');
    return fromModule;
  }
}
