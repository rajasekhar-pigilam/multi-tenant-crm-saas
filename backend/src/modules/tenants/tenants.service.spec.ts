import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MasterPrismaService } from '../../database/prisma/master-prisma.service';
import { NeonProvisioningService } from '../../database/neon/neon-provisioning.service';
import { TenantSchemaInitializerService } from '../../database/neon/tenant-schema-initializer.service';
import { TenantConnectionService } from '../../database/tenant-manager/tenant-connection.service';
import { TenantsService } from './tenants.service';

/**
 * Unit tests for TenantsService – registration and provisioning flow.
 */

const mockTenant = {
  id: 1,
  name: 'Acme Corp',
  slug: 'acme',
  databaseUrl: null,
  status: 'PROVISIONING' as const,
  createdAt: new Date(),
  updatedAt: new Date()
};

const activeTenant = {
  ...mockTenant,
  databaseUrl: 'postgresql://localhost/crm_tenant_acme_db',
  status: 'ACTIVE' as const
};

const mockAdminUser = {
  id: 5,
  email: 'admin@acme.com',
  passwordHash: 'hash',
  status: 'ACTIVE' as const,
  createdAt: new Date()
};

describe('TenantsService', () => {
  let service: TenantsService;
  let masterPrisma: {
    tenant: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    user: { upsert: jest.Mock };
    tenantMember: { upsert: jest.Mock };
    provisioningLog: { create: jest.Mock; findMany: jest.Mock };
  };
  let neonProvisioning: jest.Mocked<Pick<NeonProvisioningService, 'createTenantDatabase' | 'deleteTenantDatabase'>>;
  let schemaInitializer: jest.Mocked<Pick<TenantSchemaInitializerService, 'applySchema'>>;

  beforeEach(async () => {
    masterPrisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockTenant),
        update: jest.fn().mockResolvedValue(activeTenant)
      },
      user: { upsert: jest.fn().mockResolvedValue(mockAdminUser) },
      tenantMember: { upsert: jest.fn().mockResolvedValue({ id: 1 }) },
      provisioningLog: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([])
      }
    };

    neonProvisioning = {
      createTenantDatabase: jest
        .fn()
        .mockResolvedValue('postgresql://localhost/crm_tenant_acme_db'),
      deleteTenantDatabase: jest.fn().mockResolvedValue(undefined)
    };

    schemaInitializer = {
      applySchema: jest.fn().mockResolvedValue(undefined)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: MasterPrismaService, useValue: masterPrisma },
        { provide: NeonProvisioningService, useValue: neonProvisioning },
        { provide: TenantSchemaInitializerService, useValue: schemaInitializer },
        {
          provide: TenantConnectionService,
          useValue: { getTenantConnection: jest.fn() }
        }
      ]
    }).compile();

    service = module.get<TenantsService>(TenantsService);
  });

  // ─── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    const dto = {
      tenantName: 'Acme Corp',
      slug: 'acme',
      adminEmail: 'admin@acme.com',
      adminPassword: 'S3cur3Pass!'
    };

    it('should complete the full provisioning flow and return an ACTIVE tenant', async () => {
      const result = await service.register(dto);

      expect(result.tenant.status).toBe('ACTIVE');
      expect(result.tenant.slug).toBe('acme');
      expect(result.admin.email).toBe('admin@acme.com');
    });

    it('should create the tenant in PROVISIONING state first', async () => {
      await service.register(dto);

      expect(masterPrisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PROVISIONING', slug: 'acme' })
        })
      );
    });

    it('should call Neon and schema initializer in order', async () => {
      const order: string[] = [];
      neonProvisioning.createTenantDatabase.mockImplementation(async () => {
        order.push('neon');
        return 'postgresql://localhost/db';
      });
      schemaInitializer.applySchema.mockImplementation(async () => {
        order.push('schema');
      });

      await service.register(dto);

      expect(order).toEqual(['neon', 'schema']);
    });

    it('should throw ConflictException when slug already exists', async () => {
      masterPrisma.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should mark tenant as FAILED and throw when Neon provisioning fails', async () => {
      neonProvisioning.createTenantDatabase.mockRejectedValue(
        new Error('Neon unreachable')
      );

      await expect(service.register(dto)).rejects.toThrow(
        InternalServerErrorException
      );

      expect(masterPrisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'FAILED' })
        })
      );
    });

    it('should rollback Neon database when schema application fails', async () => {
      schemaInitializer.applySchema.mockRejectedValue(
        new Error('DDL error')
      );

      await expect(service.register(dto)).rejects.toThrow(
        InternalServerErrorException
      );

      expect(neonProvisioning.deleteTenantDatabase).toHaveBeenCalledWith('acme');
    });

    it('should write provisioning logs at each step', async () => {
      await service.register(dto);

      const logSteps: string[] = masterPrisma.provisioningLog.create.mock.calls.map(
        (call: [{ data: { step: string } }]) => call[0].data.step
      );

      expect(logSteps).toContain('PROVISIONING_STARTED');
      expect(logSteps).toContain('NEON_DATABASE_CREATED');
      expect(logSteps).toContain('SCHEMA_APPLIED');
      expect(logSteps).toContain('TENANT_ACTIVATED');
    });
  });
});
