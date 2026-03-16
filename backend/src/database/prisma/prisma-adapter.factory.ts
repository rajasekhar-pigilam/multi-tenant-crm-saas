import { PrismaPg } from '@prisma/adapter-pg';

// Neon's PgBouncer pooler does not support startup parameters (e.g. statement_timeout).
// Timeouts are enforced at the application layer via the frontend HTTP timeout interceptor.
export function createPgAdapter(connectionString: string): PrismaPg {
  return new PrismaPg(
    {
      connectionString,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 60_000,
      max: 5
    },
    { schema: 'public' }
  );
}
