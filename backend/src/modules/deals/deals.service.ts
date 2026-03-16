import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TenantConnectionService } from '../../database/tenant-manager/tenant-connection.service';
import { CreateDealDto } from './dto/create-deal.dto';

@Injectable()
export class DealsService {
  constructor(
    private readonly tenantConnectionService: TenantConnectionService
  ) {}

  async create(currentUser: AuthenticatedUser, createDealDto: CreateDealDto) {
    const prisma = await this.getTenantPrisma(currentUser);
    const customer = await prisma.customer.findUnique({
      where: { id: createDealDto.customerId }
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer ${createDealDto.customerId} was not found`
      );
    }

    return prisma.deal.create({
      data: createDealDto,
      include: {
        customer: true
      }
    });
  }

  async findAll(currentUser: AuthenticatedUser) {
    const prisma = await this.getTenantPrisma(currentUser);
    return prisma.deal.findMany({
      include: {
        customer: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  private async getTenantPrisma(currentUser: AuthenticatedUser) {
    if (currentUser.tokenType !== 'access' || !currentUser.tenantId) {
      throw new ForbiddenException('A tenant-scoped access token is required');
    }

    return this.tenantConnectionService.getTenantConnection(currentUser.tenantId);
  }
}
