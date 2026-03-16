import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TenantConnectionService } from '../../database/tenant-manager/tenant-connection.service';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantConnectionService: TenantConnectionService
  ) {}

  async getDashboard(currentUser: AuthenticatedUser) {
    const prisma = await this.getTenantPrisma(currentUser);

    const [totalCustomers, deals, recentActivities] = await Promise.all([
      prisma.customer.count(),
      prisma.deal.findMany({
        include: {
          customer: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.activity.findMany({
        include: {
          customer: true
        },
        orderBy: {
          createdAt: 'desc'
        },
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

  private async getTenantPrisma(currentUser: AuthenticatedUser) {
    if (currentUser.tokenType !== 'access' || !currentUser.tenantId) {
      throw new ForbiddenException('A tenant-scoped access token is required');
    }

    return this.tenantConnectionService.getTenantConnection(currentUser.tenantId);
  }
}
