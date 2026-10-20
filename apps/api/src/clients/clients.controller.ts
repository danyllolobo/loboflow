import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { createClientSchema, updateClientSchema } from '@loboflow/validation';
import { ClientStatus } from '@prisma/client';

@ApiTags('Clients')
@Controller('clients')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @RequirePermissions('clients.view')
  async list(
    @CurrentOrg('id') orgId: string,
    @Query('status') status?: ClientStatus,
    @Query('search') search?: string,
  ) {
    return this.clientsService.list(orgId, status, search);
  }

  @Get(':id')
  @RequirePermissions('clients.view')
  async getOne(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
  ) {
    return this.clientsService.getOne(orgId, id);
  }

  @Post()
  @RequirePermissions('clients.create')
  async create(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = createClientSchema.parse(body);
    return this.clientsService.create(orgId, userId, input);
  }

  @Patch(':id')
  @RequirePermissions('clients.edit')
  async update(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = updateClientSchema.parse(body);
    return this.clientsService.update(orgId, id, userId, input);
  }

  @Post(':id/archive')
  @RequirePermissions('clients.delete')
  async archive(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.clientsService.archive(orgId, id, userId);
  }
}
