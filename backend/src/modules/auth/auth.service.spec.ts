import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { MasterPrismaService } from '../../database/prisma/master-prisma.service';
import { TenantConnectionService } from '../../database/tenant-manager/tenant-connection.service';
import { AuthService } from './auth.service';

/**
 * Unit tests for AuthService – login and tenant selection flows.
 *
 * Reference: NestJS Testing docs
 * https://docs.nestjs.com/fundamentals/testing
 */

const mockUser = {
  id: 1,
  email: 'raj@example.com',
  passwordHash: bcrypt.hashSync('password123', 10),
  status: 'ACTIVE' as const,
  createdAt: new Date()
};

const mockTenant = {
  id: 10,
  name: 'ABC Corp',
  slug: 'abc',
  databaseUrl: 'postgresql://localhost/test',
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockMembership = {
  id: 1,
  userId: 1,
  tenantId: 10,
  role: 'ADMIN' as const,
  user: mockUser,
  tenant: mockTenant
};

describe('AuthService', () => {
  let service: AuthService;
  let masterPrisma: jest.Mocked<MasterPrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: MasterPrismaService,
          useValue: {
            user: { findUnique: jest.fn() },
            tenantMember: { findMany: jest.fn(), findFirst: jest.fn() },
            tenant: { findUnique: jest.fn() }
          }
        },
        {
          provide: TenantConnectionService,
          useValue: {
            getTenantConnection: jest.fn().mockResolvedValue({
              user: {
                upsert: jest.fn().mockResolvedValue(mockUser)
              }
            })
          }
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('1h') }
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('mock-jwt-token') }
        }
      ]
    }).compile();

    service = module.get<AuthService>(AuthService);
    masterPrisma = module.get(MasterPrismaService);
    jwtService = module.get(JwtService);
  });

  // ─── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return user, tenants, and selectionToken on valid credentials', async () => {
      (masterPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (masterPrisma.tenantMember.findMany as jest.Mock).mockResolvedValue([
        mockMembership
      ]);

      const result = await service.login({
        email: 'raj@example.com',
        password: 'password123'
      });

      expect(result.user.email).toBe('raj@example.com');
      expect(result.tenants).toHaveLength(1);
      expect(result.tenants[0]?.name).toBe('ABC Corp');
      expect(result.selectionToken).toBe('mock-jwt-token');
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      (masterPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'x' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      (masterPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'raj@example.com', password: 'wrongpassword' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when user is DISABLED', async () => {
      (masterPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        status: 'DISABLED'
      });

      await expect(
        service.login({ email: 'raj@example.com', password: 'password123' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no active tenant memberships', async () => {
      (masterPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (masterPrisma.tenantMember.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockMembership,
          tenant: { ...mockTenant, status: 'SUSPENDED' }
        }
      ]);

      await expect(
        service.login({ email: 'raj@example.com', password: 'password123' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should issue a workspace-select token (not an access token)', async () => {
      (masterPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (masterPrisma.tenantMember.findMany as jest.Mock).mockResolvedValue([mockMembership]);

      await service.login({ email: 'raj@example.com', password: 'password123' });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ tokenType: 'workspace-select' })
      );
    });
  });

  // ─── selectTenant ────────────────────────────────────────────────────────────

  describe('selectTenant', () => {
    const workspaceUser = {
      sub: 1,
      email: 'raj@example.com',
      tokenType: 'workspace-select' as const
    };

    it('should return accessToken and tenant details on valid selection', async () => {
      (masterPrisma.tenantMember.findFirst as jest.Mock).mockResolvedValue(
        mockMembership
      );

      const result = await service.selectTenant(workspaceUser, { tenantId: 10 });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.tenant.name).toBe('ABC Corp');
      expect(result.user.role).toBe('ADMIN');
    });

    it('should throw BadRequestException when called with an access token', async () => {
      const { BadRequestException } = await import('@nestjs/common');
      await expect(
        service.selectTenant(
          { sub: 1, email: 'x', tokenType: 'access', tenantId: 1 },
          { tenantId: 10 }
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not a member of the tenant', async () => {
      (masterPrisma.tenantMember.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.selectTenant(workspaceUser, { tenantId: 99 })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when tenant is SUSPENDED', async () => {
      (masterPrisma.tenantMember.findFirst as jest.Mock).mockResolvedValue({
        ...mockMembership,
        tenant: { ...mockTenant, status: 'SUSPENDED' }
      });

      await expect(
        service.selectTenant(workspaceUser, { tenantId: 10 })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should issue an access token scoped to the selected tenant', async () => {
      (masterPrisma.tenantMember.findFirst as jest.Mock).mockResolvedValue(
        mockMembership
      );

      await service.selectTenant(workspaceUser, { tenantId: 10 });

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenType: 'access',
          tenantId: 10,
          role: 'ADMIN'
        }),
        expect.any(Object)
      );
    });
  });

  // ─── Tenant Isolation ─────────────────────────────────────────────────────────

  describe('tenant isolation', () => {
    it('should not include SUSPENDED tenant in login response', async () => {
      const suspendedMembership = {
        ...mockMembership,
        tenant: { ...mockTenant, status: 'SUSPENDED' }
      };
      const activeMembership = {
        ...mockMembership,
        id: 2,
        tenantId: 11,
        tenant: { ...mockTenant, id: 11, name: 'XYZ Ltd', slug: 'xyz' }
      };

      (masterPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (masterPrisma.tenantMember.findMany as jest.Mock).mockResolvedValue([
        suspendedMembership,
        activeMembership
      ]);

      const result = await service.login({
        email: 'raj@example.com',
        password: 'password123'
      });

      expect(result.tenants).toHaveLength(1);
      expect(result.tenants[0]?.name).toBe('XYZ Ltd');
    });
  });
});
