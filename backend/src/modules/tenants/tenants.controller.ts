import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current/dashboard')
  @ApiOperation({ summary: 'Return dashboard metrics for the current tenant' })
  @ApiResponse({ status: 200, description: 'Dashboard data returned.' })
  getDashboard(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.tenantsService.getDashboard(currentUser);
  }
}
