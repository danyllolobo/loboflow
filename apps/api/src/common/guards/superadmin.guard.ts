import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SessionUser } from '@loboflow/shared';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as SessionUser | undefined;

    if (!user || !user.isSuperAdmin) {
      throw new ForbiddenException('Acesso restrito ao SuperAdmin da plataforma');
    }

    return true;
  }
}
