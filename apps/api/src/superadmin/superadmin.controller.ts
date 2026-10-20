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
import { SuperAdminService } from './superadmin.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { SuperAdminGuard } from '../common/guards/superadmin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  adminStatusChangeSchema,
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

  @Get('organizations')
  async listOrganizations(@Query('search') search?: string) {
    return this.superadminService.listOrganizations(search);
  }

  @Get('organizations/:id')
  async getOrganization(@Param('id') id: string) {
    return this.superadminService.getOrganization(id);
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
