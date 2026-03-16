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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a customer in the current tenant' })
  @ApiResponse({ status: 201, description: 'Customer created successfully.' })
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() createCustomerDto: CreateCustomerDto
  ) {
    return this.customersService.create(currentUser, createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: 'List customers for the current tenant' })
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.customersService.findAll(currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single customer by id' })
  findOne(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.customersService.findOne(currentUser, id);
  }

  @Put(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a customer' })
  update(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCustomerDto: UpdateCustomerDto
  ) {
    return this.customersService.update(currentUser, id, updateCustomerDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a customer' })
  remove(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.customersService.remove(currentUser, id);
  }
}
