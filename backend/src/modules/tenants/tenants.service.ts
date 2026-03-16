import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { MembershipRole, TenantStatus } from '../../generated/master-client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { MasterPrismaService } from '../../database/prisma/master-prisma.service';
import { TenantConnectionService } from '../../database/tenant-manager/tenant-connection.service';
import { NeonProvisioningService } from '../../database/neon/neon-provisioning.service';
import { TenantSchemaInitializerService } from '../../database/neon/tenant-schema-initializer.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly neonProvisioning: NeonProvisioningService,
    private readonly schemaInitializer: TenantSchemaInitializerService
  ) {}

  // ─── Registration & Provisioning ────────────────────────────────────────────

  /**
   * Full tenant registration flow:
   * 1. Create tenant record as PROVISIONING
   * 2. Create Neon database
   * 3. Apply tenant schema
   * 4. Create / find admin user in master DB
   * 5. Create ADMIN membership
   * 6. Mark tenant ACTIVE
   *
   * Reference: Multi-tenant SaaS database-per-tenant pattern
   * https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/tenancy-models
   */
  async register(dto: RegisterTenantDto) {
    const existingTenant = await this.masterPrisma.tenant.findUnique({
      where: { slug: dto.slug }
    });

    if (existingTenant) {
      if (existingTenant.status === TenantStatus.FAILED) {
        // Clean up the failed attempt so the user can retry with the same slug
        await this.neonProvisioning
          .deleteTenantDatabase(dto.slug)
          .catch(() => {});
        await this.masterPrisma.tenant.delete({ where: { slug: dto.slug } });
      } else {
        throw new ConflictException(`Tenant slug "${dto.slug}" is already taken`);
      }
    }

    // Step 1 – create tenant in PROVISIONING state
    const tenant = await this.masterPrisma.tenant.create({
      data: { name: dto.tenantName, slug: dto.slug, status: TenantStatus.PROVISIONING }
    });

    await this.logStep(tenant.id, 'PROVISIONING_STARTED', 'SUCCESS');

    let databaseUrl: string;

    try {
      // Step 2 – create the database in Neon
      databaseUrl = await this.neonProvisioning.createTenantDatabase(dto.slug);
      await this.logStep(tenant.id, 'NEON_DATABASE_CREATED', 'SUCCESS');
    } catch (err) {
      await this.markFailed(tenant.id, 'NEON_DATABASE_CREATED', err);
      throw new InternalServerErrorException(
        'Failed to provision tenant database in Neon. The tenant has been marked FAILED.'
      );
    }

    try {
      // Step 3 – apply tenant schema DDL
      await this.schemaInitializer.applySchema(databaseUrl);
      await this.logStep(tenant.id, 'SCHEMA_APPLIED', 'SUCCESS');
    } catch (err) {
      await this.markFailed(tenant.id, 'SCHEMA_APPLIED', err);
      await this.neonProvisioning.deleteTenantDatabase(dto.slug);
      throw new InternalServerErrorException(
        'Failed to apply tenant schema. The tenant has been marked FAILED.'
      );
    }

    // Step 4 – update tenant record with DB URL and set ACTIVE
    const activeTenant = await this.masterPrisma.tenant.update({
      where: { id: tenant.id },
      data: { databaseUrl, status: TenantStatus.ACTIVE }
    });

    // Step 5 – create or find the admin user in the master DB
    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
    const adminUser = await this.masterPrisma.user.upsert({
      where: { email: dto.adminEmail },
      create: { email: dto.adminEmail, passwordHash },
      update: {}
    });

    // Step 6 – create ADMIN membership
    await this.masterPrisma.tenantMember.upsert({
      where: { userId_tenantId: { userId: adminUser.id, tenantId: tenant.id } },
      create: { userId: adminUser.id, tenantId: tenant.id, role: MembershipRole.ADMIN },
      update: { role: MembershipRole.ADMIN }
    });

    await this.logStep(tenant.id, 'TENANT_ACTIVATED', 'SUCCESS');
    this.logger.log(`Tenant "${dto.slug}" provisioned successfully (id=${tenant.id})`);

    return {
      tenant: {
        id: activeTenant.id,
        name: activeTenant.name,
        slug: activeTenant.slug,
        status: activeTenant.status,
        createdAt: activeTenant.createdAt
      },
      admin: { id: adminUser.id, email: adminUser.email },
      message: 'Tenant provisioned successfully. You may now log in.'
    };
  }

  // ─── Member Management ───────────────────────────────────────────────────────

  async addMember(tenantId: number, dto: AddMemberDto, currentUser: AuthenticatedUser) {
    this.assertAdminAccess(currentUser, tenantId);

    const user = await this.masterPrisma.user.findUnique({
      where: { email: dto.email }
    });
    if (!user) {
      throw new NotFoundException(`No user with email "${dto.email}" exists in the system`);
    }

    const tenant = await this.masterPrisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      throw new NotFoundException('Tenant not found or not active');
    }

    const existing = await this.masterPrisma.tenantMember.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } }
    });
    if (existing) {
      throw new ConflictException('User is already a member of this tenant');
    }

    const role = dto.role ?? MembershipRole.MEMBER;
    const member = await this.masterPrisma.tenantMember.create({
      data: { userId: user.id, tenantId, role }
    });

    return {
      memberId: member.id,
      userId: user.id,
      email: user.email,
      tenantId,
      role: member.role
    };
  }

  async listMembers(tenantId: number, currentUser: AuthenticatedUser) {
    this.assertTenantAccess(currentUser, tenantId);

    const members = await this.masterPrisma.tenantMember.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, email: true, status: true, createdAt: true } } }
    });

    return members.map(m => ({
      memberId: m.id,
      userId: m.user.id,
      email: m.user.email,
      status: m.user.status,
      role: m.role,
      joinedAt: m.user.createdAt
    }));
  }

  async removeMember(tenantId: number, memberId: number, currentUser: AuthenticatedUser) {
    this.assertAdminAccess(currentUser, tenantId);

    const member = await this.masterPrisma.tenantMember.findFirst({
      where: { id: memberId, tenantId }
    });
    if (!member) {
      throw new NotFoundException('Membership not found');
    }

    if (member.userId === currentUser.sub) {
      throw new ForbiddenException('You cannot remove yourself from the tenant');
    }

    await this.masterPrisma.tenantMember.delete({ where: { id: memberId } });
    return { message: 'Member removed successfully' };
  }

  async listProvisioningLogs(tenantId: number, currentUser: AuthenticatedUser) {
    this.assertAdminAccess(currentUser, tenantId);

    return this.masterPrisma.provisioningLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }
    });
  }

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  async getDashboard(currentUser: AuthenticatedUser) {
    const prisma = await this.getTenantPrisma(currentUser);

    const [totalCustomers, deals, recentActivities] = await Promise.all([
      prisma.customer.count(),
      prisma.deal.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.activity.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    return {
      totalCustomers,
      activeDeals: deals.length,
      revenuePipeline: deals.reduce((sum, deal) => sum + Number(deal.value), 0),
      recentActivities,
      deals
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async getTenantPrisma(currentUser: AuthenticatedUser) {
    if (currentUser.tokenType !== 'access' || !currentUser.tenantId) {
      throw new ForbiddenException('A tenant-scoped access token is required');
    }
    return this.tenantConnectionService.getTenantConnection(currentUser.tenantId);
  }

  private assertTenantAccess(user: AuthenticatedUser, tenantId: number): void {
    if (user.tokenType !== 'access' || user.tenantId !== tenantId) {
      throw new ForbiddenException('You do not have access to this tenant');
    }
  }

  private assertAdminAccess(user: AuthenticatedUser, tenantId: number): void {
    this.assertTenantAccess(user, tenantId);
    if (user.role !== MembershipRole.ADMIN) {
      throw new ForbiddenException('Only tenant ADMIN members can perform this action');
    }
  }

  private async logStep(
    tenantId: number,
    step: string,
    status: 'SUCCESS' | 'FAILED',
    message?: string
  ): Promise<void> {
    try {
      await this.masterPrisma.provisioningLog.create({
        data: { tenantId, step, status, message }
      });
    } catch {
      this.logger.warn(`Could not write provisioning log step "${step}" for tenant ${tenantId}`);
    }
  }

  private async markFailed(tenantId: number, failedStep: string, err: unknown): Promise<void> {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(`Tenant ${tenantId} provisioning failed at step "${failedStep}": ${message}`);
    await Promise.all([
      this.masterPrisma.tenant
        .update({ where: { id: tenantId }, data: { status: TenantStatus.FAILED } })
        .catch(() => undefined),
      this.logStep(tenantId, failedStep, 'FAILED', message)
    ]);
  }
}
