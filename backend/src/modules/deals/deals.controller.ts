import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a single deal by id' })
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.dealsService.findOne(currentUser, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a deal (stage, value, title)' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDealDto
  ) {
    return this.dealsService.update(currentUser, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a deal (ADMIN only)' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.dealsService.remove(currentUser, id);
  }
}
