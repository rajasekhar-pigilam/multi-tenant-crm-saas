import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ─── Public – Tenant Self-Service Registration ────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new tenant',
    description:
      'Creates a new tenant in Neon, applies the tenant schema, creates the admin user, ' +
      'and marks the tenant ACTIVE. No authentication required (self-service onboarding).'
  })
  @ApiResponse({ status: 201, description: 'Tenant provisioned successfully.' })
  @ApiResponse({ status: 409, description: 'Slug already taken.' })
  @ApiResponse({ status: 500, description: 'Neon or schema provisioning failed.' })
  register(@Body() dto: RegisterTenantDto) {
    return this.tenantsService.register(dto);
  }

  // ─── Protected – Current Tenant ───────────────────────────────────────────

  @Get('current/dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Return dashboard metrics for the current tenant' })
  @ApiResponse({ status: 200, description: 'Dashboard data returned.' })
  getDashboard(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.tenantsService.getDashboard(currentUser);
  }

  @Get(':tenantId/members')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all members of the tenant (any role)' })
  @ApiResponse({ status: 200, description: 'Member list returned.' })
  listMembers(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @CurrentUser() currentUser: AuthenticatedUser
  ) {
    return this.tenantsService.listMembers(tenantId, currentUser);
  }

  @Post(':tenantId/members')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a user to this tenant (ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Member added.' })
  @ApiResponse({ status: 403, description: 'ADMIN role required.' })
  addMember(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Body() dto: AddMemberDto,
    @CurrentUser() currentUser: AuthenticatedUser
  ) {
    return this.tenantsService.addMember(tenantId, dto, currentUser);
  }

  @Delete(':tenantId/members/:memberId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Remove a member from this tenant (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Member removed.' })
  @ApiResponse({ status: 403, description: 'ADMIN role required.' })
  removeMember(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Param('memberId', ParseIntPipe) memberId: number,
    @CurrentUser() currentUser: AuthenticatedUser
  ) {
    return this.tenantsService.removeMember(tenantId, memberId, currentUser);
  }

  @Get(':tenantId/provisioning-logs')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'View provisioning logs for the tenant (ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Logs returned.' })
  listProvisioningLogs(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @CurrentUser() currentUser: AuthenticatedUser
  ) {
    return this.tenantsService.listProvisioningLogs(tenantId, currentUser);
  }
}
