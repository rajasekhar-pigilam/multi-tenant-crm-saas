import { Module } from '@nestjs/common';
import { NeonProvisioningService } from '../../database/neon/neon-provisioning.service';
import { TenantSchemaInitializerService } from '../../database/neon/tenant-schema-initializer.service';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, NeonProvisioningService, TenantSchemaInitializerService]
})
export class TenantsModule {}
