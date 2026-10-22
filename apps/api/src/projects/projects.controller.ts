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
import { ProjectsService } from './projects.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { createProjectSchema, updateProjectSchema } from '@loboflow/validation';
import { ProjectStatus } from '@prisma/client';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @RequirePermissions('projects.view')
  async list(
    @CurrentOrg('id') orgId: string,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.projectsService.list(orgId, status);
  }

  @Get(':id')
  @RequirePermissions('projects.view')
  async getOne(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
  ) {
    return this.projectsService.getOne(orgId, id);
  }

  @Post()
  @RequirePermissions('projects.create')
  async create(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = createProjectSchema.parse(body);
    return this.projectsService.create(orgId, userId, input);
  }

  @Patch(':id')
  @RequirePermissions('projects.edit')
  async update(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = updateProjectSchema.parse(body);
    return this.projectsService.update(orgId, id, userId, input);
  }

  @Delete(':id')
  @RequirePermissions('projects.delete')
  async delete(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query('permanent') permanent?: string,
  ) {
    return this.projectsService.delete(orgId, id, userId, permanent === 'true');
  }

  @Post(':id/archive')
  @RequirePermissions('projects.delete')
  async archive(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.archive(orgId, id, userId);
  }
}
