import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
import { CreateDealDto } from './dto/create-deal.dto';
import { DealsService } from './deals.service';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a deal in the current tenant' })
  @ApiResponse({ status: 201, description: 'Deal created successfully.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createDealDto: CreateDealDto
  ) {
    return this.dealsService.create(currentUser, createDealDto);
  }

  @Get()
  @ApiOperation({ summary: 'List deals for the current tenant' })
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.dealsService.findAll(currentUser);
  }
}
