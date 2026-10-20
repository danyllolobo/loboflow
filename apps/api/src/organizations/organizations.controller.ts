import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import {
  createOrganizationSchema,
  inviteMemberSchema,
  roleSchema,
  updateMemberSchema,
  updateOrganizationSchema,
} from '@loboflow/validation';
import { ActiveOrganizationContext, SessionUser } from '@loboflow/shared';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(AuthGuard)
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
  ) {
    const input = createOrganizationSchema.parse(body);
    return this.orgsService.create(userId, input);
  }

  @Get('current')
  @UseGuards(TenantGuard)
  async getCurrent(@CurrentOrg('id') orgId: string) {
    return this.orgsService.getOne(orgId);
  }

  @Patch('current')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('settings.manage')
  async updateCurrent(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') actorId: string,
    @Body() body: unknown,
  ) {
    const input = updateOrganizationSchema.parse(body);
    return this.orgsService.update(orgId, actorId, input);
  }

  @Get('current/members')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('team.view')
  async listMembers(@CurrentOrg('id') orgId: string) {
    return this.orgsService.listMembers(orgId);
  }

  @Patch('current/members/:memberId')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('team.edit')
  async updateMember(
    @CurrentOrg('id') orgId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') actorId: string,
    @Body() body: unknown,
  ) {
    const input = updateMemberSchema.parse(body);
    return this.orgsService.updateMember(orgId, memberId, actorId, input);
  }

  @Post('current/invitations')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('team.invite')
  async inviteMember(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') actorId: string,
    @Body() body: unknown,
  ) {
    const input = inviteMemberSchema.parse(body);
    return this.orgsService.inviteMember(orgId, actorId, input);
  }

  @Get('current/roles')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('team.view')
  async listRoles(@CurrentOrg('id') orgId: string) {
    return this.orgsService.listRoles(orgId);
  }

  @Post('current/roles')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('team.edit')
  async createRole(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') actorId: string,
    @Body() body: unknown,
  ) {
    const input = roleSchema.parse(body);
    return this.orgsService.createRole(orgId, actorId, input);
  }

  @Patch('current/roles/:roleId')
  @UseGuards(TenantGuard, PermissionsGuard)
  @RequirePermissions('team.edit')
  async updateRole(
    @CurrentOrg('id') orgId: string,
    @Param('roleId') roleId: string,
    @CurrentUser('id') actorId: string,
    @Body() body: unknown,
  ) {
    const input = roleSchema.parse(body);
    return this.orgsService.updateRole(orgId, roleId, actorId, input);
  }
}
