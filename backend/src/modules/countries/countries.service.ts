import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TenantConnectionService } from '../../database/tenant-manager/tenant-connection.service';

@Injectable()
export class CountriesService {
  constructor(
    private readonly tenantConnectionService: TenantConnectionService
  ) {}

  /** All countries for the tenant, ordered by name. */
  async findAll(currentUser: AuthenticatedUser) {
    const prisma = await this.getTenantPrisma(currentUser);
    return prisma.country.findMany({ orderBy: { name: 'asc' } });
  }

  /** Only active countries — used by the customer form dropdown. */
  async findActive(currentUser: AuthenticatedUser) {
    const prisma = await this.getTenantPrisma(currentUser);
    return prisma.country.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Toggle is_active for a country.
   * Disabling a country does NOT delete it and does NOT break existing
   * customer FK references — existing records retain their country_code.
   */
  async toggle(currentUser: AuthenticatedUser, code: string) {
    const prisma = await this.getTenantPrisma(currentUser);
    const country = await prisma.country.findUnique({ where: { code } });

    if (!country) {
      throw new NotFoundException(`Country "${code}" not found in this tenant`);
    }

    return prisma.country.update({
      where: { code },
      data: { isActive: !country.isActive }
    });
  }

  private async getTenantPrisma(currentUser: AuthenticatedUser) {
    if (currentUser.tokenType !== 'access' || !currentUser.tenantId) {
      throw new ForbiddenException('A tenant-scoped access token is required');
    }
    return this.tenantConnectionService.getTenantConnection(currentUser.tenantId);
  }
}
