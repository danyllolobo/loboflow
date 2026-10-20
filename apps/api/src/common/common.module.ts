import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { AuditService } from './audit.service';
import { AuthGuard } from './guards/auth.guard';
import { TenantGuard } from './guards/tenant.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { APP_ENV, loadEnv } from '../config/env';

@Global()
@Module({
  providers: [
    {
      provide: APP_ENV,
      useFactory: () => loadEnv(),
    },
    EncryptionService,
    AuditService,
    AuthGuard,
    TenantGuard,
    PermissionsGuard,
    SuperAdminGuard,
  ],
  exports: [
    APP_ENV,
    EncryptionService,
    AuditService,
    AuthGuard,
    TenantGuard,
    PermissionsGuard,
    SuperAdminGuard,
  ],
})
export class CommonModule {}
