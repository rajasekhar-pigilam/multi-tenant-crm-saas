import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/master-client';
import { createPgAdapter } from './prisma-adapter.factory';

@Injectable()
export class MasterPrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const connectionString = configService.get<string>('database.masterDbUrl');

    if (!connectionString) {
      throw new UnauthorizedException('MASTER_DB_URL is required');
    }

    super({
      adapter: createPgAdapter(connectionString)
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
