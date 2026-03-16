import * as path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({
  path: path.resolve(process.cwd(), '..', '.env')
});

export default defineConfig({
  schema: 'schema.prisma',
  migrations: {
    path: '../../atlas/master'
  },
  datasource: {
    url:
      process.env.MASTER_DB_URL ??
      'postgresql://postgres:postgres@localhost:5432/crm_master_db?schema=public'
  }
});
