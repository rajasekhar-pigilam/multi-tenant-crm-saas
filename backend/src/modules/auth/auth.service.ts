import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  TenantStatus,
  UserStatus
} from '../../generated/master-client';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { MasterPrismaService } from '../../database/prisma/master-prisma.service';
import { TenantConnectionService } from '../../database/tenant-manager/tenant-connection.service';
import { LoginDto } from './dto/login.dto';
import { SelectTenantDto } from './dto/select-tenant.dto';

type JwtExpiry =
  | number
  | `${number}${'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly tenantConnectionService: TenantConnectionService
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.masterPrisma.user.findUnique({
      where: { email: loginDto.email }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('The user is not active');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const memberships = await this.masterPrisma.tenantMember.findMany({
      where: { userId: user.id },
      include: {
        tenant: true
      }
    });

    const activeTenants = memberships.filter(
      membership => membership.tenant.status === TenantStatus.ACTIVE
    );

    if (activeTenants.length === 0) {
      throw new ForbiddenException('No active tenant memberships were found');
    }

    const selectionToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      tokenType: 'workspace-select'
    } satisfies AuthenticatedUser);

    return {
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt
      },
      tenants: activeTenants.map(membership => ({
        id: membership.tenant.id,
        name: membership.tenant.name,
        role: membership.role
      })),
      selectionToken
    };
  }

  async selectTenant(
    currentUser: AuthenticatedUser,
    selectTenantDto: SelectTenantDto
  ) {
    if (currentUser.tokenType !== 'workspace-select') {
      throw new BadRequestException(
        'A workspace selection token is required for this request'
      );
    }

    const membership = await this.masterPrisma.tenantMember.findFirst({
      where: {
        userId: currentUser.sub,
        tenantId: selectTenantDto.tenantId
      },
      include: {
        user: true,
        tenant: true
      }
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not a member of the requested workspace'
      );
    }

    if (membership.tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException('The selected tenant is not active');
    }

    const tenantPrisma = await this.tenantConnectionService.getTenantConnection(
      membership.tenant.id
    );

    await tenantPrisma.user.upsert({
      where: { email: membership.user.email },
      update: {
        role: membership.role
      },
      create: {
        email: membership.user.email,
        role: membership.role,
        createdAt: membership.user.createdAt
      }
    });

    const payload: AuthenticatedUser = {
      sub: membership.user.id,
      email: membership.user.email,
      tenantId: membership.tenant.id,
      role: membership.role,
      tokenType: 'access'
    };

    const expiresIn = this.configService.get<string>(
      'database.jwtExpiresIn',
      '1h'
    ) as JwtExpiry;

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn
    });

    return {
      accessToken,
      expiresIn,
      tenant: {
        id: membership.tenant.id,
        name: membership.tenant.name
      },
      user: {
        id: membership.user.id,
        email: membership.user.email,
        role: membership.role
      }
    };
  }

}
