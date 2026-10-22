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
import { ContentScriptsService } from './content-scripts.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActiveOrganizationContext, SessionUser } from '@loboflow/shared';
import { createScriptSchema, updateScriptSchema } from '@loboflow/validation';
import { ScriptStatus } from '@prisma/client';

@ApiTags('Scripts')
@UseGuards(AuthGuard, TenantGuard)
@Controller('scripts')
export class ContentScriptsController {
  constructor(private readonly scriptsService: ContentScriptsService) {}

  @Get()
  async list(
    @CurrentOrg() org: ActiveOrganizationContext,
    @Query('clientId') clientId?: string,
    @Query('format') format?: string,
    @Query('status') status?: ScriptStatus,
    @Query('referenceMonth') referenceMonth?: string,
    @Query('q') q?: string,
  ) {
    return this.scriptsService.list(org.id, {
      clientId,
      format,
      status,
      referenceMonth,
      q,
    });
  }

  @Get(':id')
  async getOne(
    @CurrentOrg() org: ActiveOrganizationContext,
    @Param('id') id: string,
  ) {
    return this.scriptsService.getOne(org.id, id);
  }

  @Post()
  async create(
    @CurrentOrg() org: ActiveOrganizationContext,
    @CurrentUser() user: SessionUser,
    @Body() body: unknown,
  ) {
    const input = createScriptSchema.parse(body);
    return this.scriptsService.create(org.id, user.id, input);
  }

  @Patch(':id')
  async update(
    @CurrentOrg() org: ActiveOrganizationContext,
    @CurrentUser() user: SessionUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateScriptSchema.parse(body);
    return this.scriptsService.update(org.id, id, user.id, input);
  }

  @Patch(':id/status')
  async changeStatus(
    @CurrentOrg() org: ActiveOrganizationContext,
    @Param('id') id: string,
    @Body('status') status: ScriptStatus,
  ) {
    return this.scriptsService.changeStatus(org.id, id, status);
  }

  @Delete(':id')
  async delete(
    @CurrentOrg() org: ActiveOrganizationContext,
    @Param('id') id: string,
    @Query('permanent') permanent?: string,
  ) {
    return this.scriptsService.delete(org.id, id, permanent === 'true');
  }

  @Post(':id/archive')
  async archive(
    @CurrentOrg() org: ActiveOrganizationContext,
    @Param('id') id: string,
  ) {
    return this.scriptsService.archive(org.id, id);
  }
}
