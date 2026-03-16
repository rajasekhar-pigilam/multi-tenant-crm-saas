import * as path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({
  path: path.resolve(process.cwd(), '..', '.env')
});

export default defineConfig({
  schema: 'schema.prisma',
  migrations: {
    path: '../../atlas/tenant'
  },
  datasource: {
    url:
      process.env.TENANT_DEMO_DB_URL ??
      'postgresql://postgres:postgres@localhost:5432/crm_tenant_demo_db?schema=public'
  }
});
