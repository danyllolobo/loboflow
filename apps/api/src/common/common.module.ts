import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { AuditService } from './audit.service';
import { AuthGuard } from './guards/auth.guard';
import { TenantGuard } from './guards/tenant.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SuperAdminGuard } from './guards/superadmin.guard';

@Global()
@Module({
  providers: [
    EncryptionService,
    AuditService,
    AuthGuard,
    TenantGuard,
    PermissionsGuard,
    SuperAdminGuard,
  ],
  exports: [
    EncryptionService,
    AuditService,
    AuthGuard,
    TenantGuard,
    PermissionsGuard,
    SuperAdminGuard,
  ],
})
export class CommonModule {}
