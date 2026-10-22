import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  createContractSchema,
  updateContractSchema,
  endContractSchema,
} from '@loboflow/validation';
import { ContractStatus, RenewalStatus } from '@prisma/client';

@ApiTags('Contracts')
@Controller('contracts')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  @RequirePermissions('contracts.view')
  async list(
    @CurrentOrg('id') orgId: string,
    @Query('status') status?: ContractStatus,
    @Query('clientId') clientId?: string,
    @Query('renewalStatus') renewalStatus?: RenewalStatus,
    @Query('search') search?: string,
  ) {
    return this.contractsService.list(orgId, {
      status,
      clientId,
      renewalStatus,
      search,
    });
  }

  @Get('metrics')
  @RequirePermissions('contracts.view')
  async getMetrics(@CurrentOrg('id') orgId: string) {
    return this.contractsService.getMetrics(orgId);
  }

  @Get(':id')
  @RequirePermissions('contracts.view')
  async getOne(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
  ) {
    return this.contractsService.getOne(orgId, id);
  }

  @Post()
  @RequirePermissions('contracts.create')
  async create(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = createContractSchema.parse(body);
    return this.contractsService.create(orgId, userId, input);
  }

  @Patch(':id')
  @RequirePermissions('contracts.edit')
  async update(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = updateContractSchema.parse(body);
    return this.contractsService.update(orgId, id, userId, input);
  }

  @Post(':id/end')
  @RequirePermissions('contracts.edit')
  async endContract(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = endContractSchema.parse(body);
    return this.contractsService.endContract(orgId, id, userId, input);
  }

  @Post(':id/renew')
  @RequirePermissions('contracts.edit')
  async renewContract(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('newEndDate') newEndDate?: string,
  ) {
    return this.contractsService.renewContract(orgId, id, userId, newEndDate);
  }

  @Delete(':id')
  @RequirePermissions('contracts.delete')
  async delete(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contractsService.delete(orgId, id, userId);
  }
}
