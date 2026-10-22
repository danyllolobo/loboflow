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
import { DealsService } from './deals.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActiveOrganizationContext, SessionUser } from '@loboflow/shared';
import {
  changeDealStageSchema,
  createDealSchema,
  dealInteractionSchema,
  updateDealSchema,
} from '@loboflow/validation';
import { DealStage } from '@prisma/client';

@ApiTags('Deals')
@UseGuards(AuthGuard, TenantGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  async list(
    @CurrentOrg() org: ActiveOrganizationContext,
    @Query('stage') stage?: DealStage,
    @Query('ownerId') ownerId?: string,
    @Query('clientId') clientId?: string,
    @Query('q') q?: string,
  ) {
    return this.dealsService.list(org.id, {
      stage,
      ownerId,
      clientId,
      q,
    });
  }

  @Get('summary')
  async summary(@CurrentOrg() org: ActiveOrganizationContext) {
    return this.dealsService.getPipelineSummary(org.id);
  }

  @Get(':id')
  async getOne(
    @CurrentOrg() org: ActiveOrganizationContext,
    @Param('id') id: string,
  ) {
    return this.dealsService.getOne(org.id, id);
  }

  @Post()
  async create(
    @CurrentOrg() org: ActiveOrganizationContext,
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ) {
    const input = createDealSchema.parse(body);
    return this.dealsService.create(org.id, user.id, input);
  }

  @Patch(':id')
  async update(
    @CurrentOrg() org: ActiveOrganizationContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateDealSchema.parse(body);
    return this.dealsService.update(org.id, id, input);
  }

  @Patch(':id/stage')
  async changeStage(
    @CurrentOrg() org: ActiveOrganizationContext,
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = changeDealStageSchema.parse(body);
    return this.dealsService.changeStage(org.id, id, user.id, input);
  }

  @Post(':id/interactions')
  async addInteraction(
    @CurrentOrg() org: ActiveOrganizationContext,
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = dealInteractionSchema.parse(body);
    return this.dealsService.addInteraction(org.id, id, user.id, input);
  }

  @Delete(':id')
  async delete(
    @CurrentOrg() org: ActiveOrganizationContext,
    @Param('id') id: string,
  ) {
    return this.dealsService.delete(org.id, id);
  }
}
