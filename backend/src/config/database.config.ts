import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  masterDbUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  apiPrefix: string;
  port: number;
  corsOrigin: string;
  neon: {
    apiKey: string;
    projectId: string;
    dbOwner: string;
    dbTemplate: string;
  };
}

export default registerAs(
  'database',
  (): DatabaseConfig => ({
    masterDbUrl: process.env.MASTER_DB_URL ?? '',
    jwtSecret: process.env.JWT_SECRET ?? 'change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    apiPrefix: process.env.API_PREFIX ?? 'api',
    port: Number(process.env.PORT ?? 3000),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    neon: {
      apiKey: process.env.NEON_API_KEY ?? '',
      projectId: process.env.NEON_PROJECT_ID ?? '',
      dbOwner: process.env.NEON_DB_OWNER ?? 'neondb_owner',
      dbTemplate: process.env.TENANT_DB_TEMPLATE ?? 'crm_tenant_{slug}_db'
    }
  })
);
