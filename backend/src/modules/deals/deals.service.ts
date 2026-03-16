import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TenantConnectionService } from '../../database/tenant-manager/tenant-connection.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';

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
      include: { customer: true }
    });
  }

  async findAll(currentUser: AuthenticatedUser) {
    const prisma = await this.getTenantPrisma(currentUser);
    return prisma.deal.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(currentUser: AuthenticatedUser, id: number) {
    const prisma = await this.getTenantPrisma(currentUser);
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: { customer: true }
    });
    if (!deal) throw new NotFoundException(`Deal ${id} not found`);
    return deal;
  }

  async update(
    currentUser: AuthenticatedUser,
    id: number,
    dto: UpdateDealDto
  ) {
    const prisma = await this.getTenantPrisma(currentUser);
    const deal = await prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException(`Deal ${id} not found`);

    return prisma.deal.update({
      where: { id },
      data: dto,
      include: { customer: true }
    });
  }

  async remove(currentUser: AuthenticatedUser, id: number) {
    const prisma = await this.getTenantPrisma(currentUser);
    const deal = await prisma.deal.findUnique({ where: { id } });
    if (!deal) throw new NotFoundException(`Deal ${id} not found`);

    await prisma.deal.delete({ where: { id } });
    return { message: `Deal ${id} deleted` };
  }

  private async getTenantPrisma(currentUser: AuthenticatedUser) {
    if (currentUser.tokenType !== 'access' || !currentUser.tenantId) {
      throw new ForbiddenException('A tenant-scoped access token is required');
    }

    return this.tenantConnectionService.getTenantConnection(currentUser.tenantId);
  }
}
