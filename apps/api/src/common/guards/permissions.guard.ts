import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { ActiveOrganizationContext, PermissionKey } from '@loboflow/shared';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionKey[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const orgContext = request.organizationContext as ActiveOrganizationContext | undefined;

    if (!orgContext) {
      throw new ForbiddenException('Contexto de organização não definido');
    }

    // Proprietário da organização tem acesso total a qualquer funcionalidade
    if (orgContext.role.isOwner || orgContext.permissions['*']) {
      return true;
    }

    const missingPermissions = requiredPermissions.filter(
      (perm) => !orgContext.permissions[perm],
    );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException(
        `Permissão insuficiente: requer [${missingPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
