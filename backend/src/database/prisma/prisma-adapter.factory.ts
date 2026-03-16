import { PrismaPg } from '@prisma/adapter-pg';

export function createPgAdapter(connectionString: string): PrismaPg {
  return new PrismaPg(
    {
      connectionString,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 300_000
    },
    {
      schema: 'public'
    }
  );
}
