import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AuthModule } from './modules/auth/auth.module';
import { CountriesModule } from './modules/countries/countries.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DealsModule } from './modules/deals/deals.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
      load: [databaseConfig]
    }),
    DatabaseModule,
    AuthModule,
    TenantsModule,
    CountriesModule,
    CustomersModule,
    DealsModule,
    ActivitiesModule
  ]
})
export class AppModule {}
