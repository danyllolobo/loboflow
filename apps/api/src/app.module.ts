import { Module } from '@nestjs/common';
import { APP_ENV, loadEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { TasksModule } from './tasks/tasks.module';
import { ProjectsModule } from './projects/projects.module';
import { ClientsModule } from './clients/clients.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { ContentScriptsModule } from './content-scripts/content-scripts.module';
import { DealsModule } from './deals/deals.module';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    AuthModule,
    OrganizationsModule,
    SuperAdminModule,
    TasksModule,
    ProjectsModule,
    ClientsModule,
    DashboardModule,
    HealthModule,
    ContentScriptsModule,
    DealsModule,
  ],
  providers: [
    {
      provide: APP_ENV,
      useFactory: () => loadEnv(),
    },
  ],
  exports: [APP_ENV],
})
export class AppModule {}
