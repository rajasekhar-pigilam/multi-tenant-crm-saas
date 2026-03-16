import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '../../generated/tenant-client';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { createPgAdapter } from '../prisma/prisma-adapter.factory';

@Injectable()
export class TenantConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionService.name);
  private readonly tenantClients = new Map<number, TenantPrismaClient>();

  constructor(private readonly masterPrisma: MasterPrismaService) {}

  async getTenantConnection(tenantId: number): Promise<TenantPrismaClient> {
    const cachedClient = this.tenantClients.get(tenantId);
    if (cachedClient) {
      return cachedClient;
    }

    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new Error(`Tenant ${tenantId} was not found in the master database`);
    }

    if (!tenant.databaseUrl) {
      throw new Error(`Tenant ${tenantId} has no database URL (still provisioning?)`);
    }

    const client = new TenantPrismaClient({
      adapter: createPgAdapter(tenant.databaseUrl)
    });

    await client.$connect();
    this.tenantClients.set(tenantId, client);
    this.logger.log(`Cached Prisma client for tenant ${tenantId}`);

    return client;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(
      [...this.tenantClients.values()].map(async client => client.$disconnect())
    );
    this.tenantClients.clear();
  }
}
