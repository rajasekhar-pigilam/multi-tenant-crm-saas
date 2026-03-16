import * as path from 'node:path';
import * as bcrypt from 'bcrypt';
import { config as loadEnv } from 'dotenv';
import {
  MembershipRole,
  PrismaClient as MasterPrismaClient,
  TenantStatus,
  UserStatus
} from '../../src/generated/master-client';
import {
  PrismaClient as TenantPrismaClient,
  TenantUserRole
} from '../../src/generated/tenant-client';
import { createPgAdapter } from '../../src/database/prisma/prisma-adapter.factory';

loadEnv({
  path: path.resolve(process.cwd(), '..', '.env')
});

async function seed() {
  const masterDbUrl = process.env.MASTER_DB_URL;
  const tenantDbUrls = [
    {
      name: 'ABC Corp',
      url: process.env.TENANT_ABC_DB_URL,
      role: MembershipRole.ADMIN
    },
    {
      name: 'XYZ Ltd',
      url: process.env.TENANT_XYZ_DB_URL,
      role: MembershipRole.MANAGER
    },
    {
      name: 'Demo Workspace',
      url: process.env.TENANT_DEMO_DB_URL,
      role: MembershipRole.ADMIN
    }
  ];

  if (!masterDbUrl || tenantDbUrls.some(tenant => !tenant.url)) {
    throw new Error('Missing required database URLs in the environment');
  }

  const passwordHash = await bcrypt.hash('123456', 10);
  const masterPrisma = new MasterPrismaClient({
    adapter: createPgAdapter(masterDbUrl)
  });

  await masterPrisma.$connect();

  const [raj, john] = await Promise.all([
    masterPrisma.user.upsert({
      where: { email: 'raj@gmail.com' },
      update: {
        passwordHash,
        status: UserStatus.ACTIVE
      },
      create: {
        email: 'raj@gmail.com',
        passwordHash,
        status: UserStatus.ACTIVE
      }
    }),
    masterPrisma.user.upsert({
      where: { email: 'john@yahoo.com' },
      update: {
        passwordHash,
        status: UserStatus.ACTIVE
      },
      create: {
        email: 'john@yahoo.com',
        passwordHash,
        status: UserStatus.ACTIVE
      }
    })
  ]);

  const slugs: Record<string, string> = {
    'ABC Corp': 'abc-corp',
    'XYZ Ltd': 'xyz-ltd',
    'Demo Workspace': 'demo-workspace'
  };

  const tenantRecords: Array<{ id: number; name: string; databaseUrl: string }> = [];
  for (const tenantInfo of tenantDbUrls) {
    const slug = slugs[tenantInfo.name] ?? tenantInfo.name.toLowerCase().replace(/\s+/g, '-');
    const record = await masterPrisma.tenant.upsert({
      where: { databaseUrl: tenantInfo.url! },
      update: {
        name: tenantInfo.name,
        slug,
        status: TenantStatus.ACTIVE
      },
      create: {
        name: tenantInfo.name,
        slug,
        databaseUrl: tenantInfo.url!,
        status: TenantStatus.ACTIVE
      }
    });
    if (!record.databaseUrl) throw new Error(`Tenant "${tenantInfo.name}" has no databaseUrl`);
    tenantRecords.push({ id: record.id, name: record.name, databaseUrl: record.databaseUrl });
  }

  const [abcTenant, xyzTenant] = tenantRecords;
  if (!abcTenant || !xyzTenant) {
    throw new Error('The expected demo tenants were not created');
  }

  await masterPrisma.tenantMember.upsert({
    where: {
      userId_tenantId: {
        userId: raj.id,
        tenantId: abcTenant.id
      }
    },
    update: { role: MembershipRole.ADMIN },
    create: {
      userId: raj.id,
      tenantId: abcTenant.id,
      role: MembershipRole.ADMIN
    }
  });

  await masterPrisma.tenantMember.upsert({
    where: {
      userId_tenantId: {
        userId: raj.id,
        tenantId: xyzTenant.id
      }
    },
    update: { role: MembershipRole.MANAGER },
    create: {
      userId: raj.id,
      tenantId: xyzTenant.id,
      role: MembershipRole.MANAGER
    }
  });

  await masterPrisma.tenantMember.upsert({
    where: {
      userId_tenantId: {
        userId: john.id,
        tenantId: xyzTenant.id
      }
    },
    update: { role: MembershipRole.MEMBER },
    create: {
      userId: john.id,
      tenantId: xyzTenant.id,
      role: MembershipRole.MEMBER
    }
  });

  for (const tenant of tenantRecords) {
    const tenantPrisma = new TenantPrismaClient({
      adapter: createPgAdapter(tenant.databaseUrl)
    });

    await tenantPrisma.$connect();

    await tenantPrisma.user.upsert({
      where: { email: 'raj@gmail.com' },
      update: { role: TenantUserRole.ADMIN },
      create: { email: 'raj@gmail.com', role: TenantUserRole.ADMIN }
    });

    if (tenant.name === 'XYZ Ltd') {
      await tenantPrisma.user.upsert({
        where: { email: 'john@yahoo.com' },
        update: { role: TenantUserRole.MEMBER },
        create: { email: 'john@yahoo.com', role: TenantUserRole.MEMBER }
      });
    }

    const customer = await tenantPrisma.customer.upsert({
      where: { email: `contact@${tenant.name.toLowerCase().replace(/\s+/g, '')}.com` },
      update: {
        phone: '+1-202-555-0199',
        company: tenant.name
      },
      create: {
        name: `${tenant.name} Primary Contact`,
        email: `contact@${tenant.name.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: '+1-202-555-0199',
        company: tenant.name
      }
    });

    await tenantPrisma.deal.create({
      data: {
        title: `${tenant.name} Expansion`,
        value: 15000,
        stage: 'QUALIFICATION',
        customerId: customer.id
      }
    });

    await tenantPrisma.activity.create({
      data: {
        type: 'CALL',
        notes: `Initial discovery call for ${tenant.name}`,
        customerId: customer.id
      }
    });

    await tenantPrisma.$disconnect();
  }

  await masterPrisma.$disconnect();
}

void seed();
