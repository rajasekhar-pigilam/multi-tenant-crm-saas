import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CountriesService } from './countries.service';

@ApiTags('countries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all countries for the tenant (active and inactive)' })
  @ApiResponse({ status: 200, description: 'Countries list.' })
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.countriesService.findAll(currentUser);
  }

  @Get('active')
  @ApiOperation({ summary: 'List only active countries — used by the customer form' })
  @ApiResponse({ status: 200, description: 'Active countries list.' })
  findActive(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.countriesService.findActive(currentUser);
  }

  @Patch(':code/toggle')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Toggle is_active for a country (ADMIN only)' })
  @ApiParam({ name: 'code', example: 'US', description: 'ISO-2 country code' })
  @ApiResponse({ status: 200, description: 'Updated country.' })
  toggle(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('code') code: string
  ) {
    return this.countriesService.toggle(currentUser, code.toUpperCase());
  }
}
