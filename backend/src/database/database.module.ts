import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MasterPrismaService } from './prisma/master-prisma.service';
import { TenantConnectionService } from './tenant-manager/tenant-connection.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [MasterPrismaService, TenantConnectionService],
  exports: [MasterPrismaService, TenantConnectionService]
})
export class DatabaseModule {}
