import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TenantConnectionService } from '../../database/tenant-manager/tenant-connection.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly tenantConnectionService: TenantConnectionService
  ) {}

  async create(currentUser: AuthenticatedUser, createCustomerDto: CreateCustomerDto) {
    const prisma = await this.getTenantPrisma(currentUser);
    return prisma.customer.create({
      data: createCustomerDto
    });
  }

  async findAll(currentUser: AuthenticatedUser) {
    const prisma = await this.getTenantPrisma(currentUser);
    return prisma.customer.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findOne(currentUser: AuthenticatedUser, id: number) {
    const prisma = await this.getTenantPrisma(currentUser);
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        deals: true,
        activities: true
      }
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} was not found`);
    }

    return customer;
  }

  async update(
    currentUser: AuthenticatedUser,
    id: number,
    updateCustomerDto: UpdateCustomerDto
  ) {
    const prisma = await this.getTenantPrisma(currentUser);
    await this.findOne(currentUser, id);

    return prisma.customer.update({
      where: { id },
      data: updateCustomerDto
    });
  }

  async remove(currentUser: AuthenticatedUser, id: number) {
    const prisma = await this.getTenantPrisma(currentUser);
    await this.findOne(currentUser, id);

    return prisma.customer.delete({
      where: { id }
    });
  }

  private async getTenantPrisma(currentUser: AuthenticatedUser) {
    if (currentUser.tokenType !== 'access' || !currentUser.tenantId) {
      throw new ForbiddenException('A tenant-scoped access token is required');
    }

    return this.tenantConnectionService.getTenantConnection(currentUser.tenantId);
  }
}
