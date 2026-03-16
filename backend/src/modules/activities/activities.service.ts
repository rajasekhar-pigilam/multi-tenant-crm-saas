import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TenantConnectionService } from '../../database/tenant-manager/tenant-connection.service';
import { CreateActivityDto } from './dto/create-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly tenantConnectionService: TenantConnectionService
  ) {}

  async create(
    currentUser: AuthenticatedUser,
    createActivityDto: CreateActivityDto
  ) {
    const prisma = await this.getTenantPrisma(currentUser);
    const customer = await prisma.customer.findUnique({
      where: { id: createActivityDto.customerId }
    });

    if (!customer) {
      throw new NotFoundException(
        `Customer ${createActivityDto.customerId} was not found`
      );
    }

    return prisma.activity.create({
      data: createActivityDto,
      include: {
        customer: true
      }
    });
  }

  async findAll(currentUser: AuthenticatedUser) {
    const prisma = await this.getTenantPrisma(currentUser);
    return prisma.activity.findMany({
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
