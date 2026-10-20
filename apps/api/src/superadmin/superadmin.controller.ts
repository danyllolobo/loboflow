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
import { SuperAdminService } from './superadmin.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { SuperAdminGuard } from '../common/guards/superadmin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  adminCreateOrganizationSchema,
  adminCreateUserSchema,
  adminResetPasswordSchema,
  adminSetModulesSchema,
  adminStatusChangeSchema,
  adminUpdateOrganizationSchema,
  adminUpdateUserSchema,
  supportGrantSchema,
} from '@loboflow/validation';

@ApiTags('SuperAdmin')
@Controller('superadmin')
@UseGuards(AuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superadminService: SuperAdminService) {}

  @Get('metrics')
  async getMetrics() {
    return this.superadminService.getMetrics();
  }

  /* ------------------------------------------------------------------ */
  /* CONTAS / ORGANIZAÇÕES                                              */
  /* ------------------------------------------------------------------ */

  @Get('organizations')
  async listOrganizations(@Query('search') search?: string) {
    return this.superadminService.listOrganizations(search);
  }

  @Post('organizations')
  async createOrganization(
    @CurrentUser('id') superAdminId: string,
    @Body() body: unknown,
  ) {
    const input = adminCreateOrganizationSchema.parse(body);
    return this.superadminService.createOrganization(superAdminId, input);
  }

  @Get('organizations/:id')
  async getOrganization(@Param('id') id: string) {
    return this.superadminService.getOrganization(id);
  }

  @Patch('organizations/:id')
  async updateOrganization(
    @Param('id') id: string,
    @CurrentUser('id') superAdminId: string,
    @Body() body: any,
  ) {
    const input = adminUpdateOrganizationSchema.parse(body);
    return this.superadminService.updateOrganization(id, superAdminId, {
      ...input,
      slug: body.slug,
      status: body.status,
      timezone: body.timezone,
    });
  }

  @Delete('organizations/:id')
  async deleteOrganization(
    @Param('id') id: string,
    @CurrentUser('id') superAdminId: string,
    @Query('confirm') confirm: string,
  ) {
    return this.superadminService.deleteOrganization(id, superAdminId, confirm || '');
  }

  @Post('organizations/:id/modules')
  async setOrganizationModules(
    @Param('id') id: string,
    @CurrentUser('id') superAdminId: string,
    @Body() body: unknown,
  ) {
    const input = adminSetModulesSchema.parse(body);
    return this.superadminService.setOrganizationModules(id, superAdminId, input.enabledModules);
  }

  @Post('organizations/:id/suspend')
  async suspendOrganization(
    @Param('id') id: string,
    @CurrentUser('id') superAdminId: string,
    @Body() body: unknown,
  ) {
    const input = adminStatusChangeSchema.parse(body);
    return this.superadminService.suspendOrganization(id, superAdminId, input);
  }

  @Post('organizations/:id/activate')
  async activateOrganization(
    @Param('id') id: string,
    @CurrentUser('id') superAdminId: string,
  ) {
    return this.superadminService.activateOrganization(id, superAdminId);
  }

  /* ------------------------------------------------------------------ */
  /* USUÁRIOS GLOBAIS                                                   */
  /* ------------------------------------------------------------------ */

  @Get('users')
  async listUsers(@Query('search') search?: string) {
    return this.superadminService.listUsers(search);
  }

  @Post('users')
  async createUser(
    @CurrentUser('id') superAdminId: string,
    @Body() body: unknown,
  ) {
    const input = adminCreateUserSchema.parse(body);
    return this.superadminService.createUser(superAdminId, input);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @CurrentUser('id') superAdminId: string,
    @Body() body: unknown,
  ) {
    const input = adminUpdateUserSchema.parse(body);
    return this.superadminService.updateUser(id, superAdminId, input);
  }

  @Post('users/:id/reset-password')
  async resetUserPassword(
    @Param('id') id: string,
    @CurrentUser('id') superAdminId: string,
    @Body() body: unknown,
  ) {
    const input = adminResetPasswordSchema.parse(body);
    return this.superadminService.resetUserPassword(id, superAdminId, input);
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') superAdminId: string,
  ) {
    return this.superadminService.deleteUser(id, superAdminId);
  }

  /* ------------------------------------------------------------------ */
  /* MÓDULOS DO SISTEMA                                                 */
  /* ------------------------------------------------------------------ */

  @Get('modules')
  async listModules() {
    return this.superadminService.listModules();
  }

  /* ------------------------------------------------------------------ */
  /* SUPORTE & AUDITORIA                                                */
  /* ------------------------------------------------------------------ */

  @Post('organizations/:id/support-grants')
  async createSupportGrant(
    @Param('id') id: string,
    @CurrentUser('id') superAdminId: string,
    @Body() body: unknown,
  ) {
    const input = supportGrantSchema.parse(body);
    return this.superadminService.createSupportGrant(superAdminId, id, input);
  }

  @Patch('support-grants/:grantId/revoke')
  async revokeSupportGrant(
    @Param('grantId') grantId: string,
    @CurrentUser('id') superAdminId: string,
  ) {
    return this.superadminService.revokeSupportGrant(superAdminId, grantId);
  }

  @Get('audit-logs')
  async listAuditLogs(@Query('orgId') orgId?: string) {
    return this.superadminService.listAuditLogs(orgId);
  }
}
