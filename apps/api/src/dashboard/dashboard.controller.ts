import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CurrentOrg } from '../common/decorators/current-org.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard, TenantGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @RequirePermissions('dashboard.view')
  async getMetrics(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.dashboardService.getMetrics(orgId, userId);
  }
}
