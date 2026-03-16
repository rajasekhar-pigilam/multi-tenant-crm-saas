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
import { CreateActivityDto } from './dto/create-activity.dto';
import { ActivitiesService } from './activities.service';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER', 'MEMBER')
  @ApiOperation({ summary: 'Create an activity in the current tenant' })
  @ApiResponse({ status: 201, description: 'Activity created successfully.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createActivityDto: CreateActivityDto
  ) {
    return this.activitiesService.create(currentUser, createActivityDto);
  }

  @Get()
  @ApiOperation({ summary: 'List activities for the current tenant' })
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.activitiesService.findAll(currentUser);
  }
}
