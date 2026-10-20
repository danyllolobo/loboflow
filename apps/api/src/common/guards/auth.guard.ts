import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SessionUser } from '@loboflow/shared';

export const SESSION_COOKIE_NAME = 'loboflow_session';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Sessão não autenticada');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada ou inválida');
    }

    if (session.user.disabledAt) {
      throw new UnauthorizedException('Conta de usuário desativada');
    }

    // Atualização leve de lastSeenAt (apenas se passou mais de 5 minutos)
    const now = new Date();
    if (now.getTime() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
      this.prisma.session
        .update({
          where: { id: session.id },
          data: { lastSeenAt: now },
        })
        .catch(() => {});
    }

    const sessionUser: SessionUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      isSuperAdmin: session.user.isSuperAdmin,
      emailVerified: !!session.user.emailVerifiedAt,
      theme: session.user.theme as 'light' | 'dark' | 'system',
      timezone: session.user.timezone,
    };

    (request as any).user = sessionUser;
    (request as any).sessionId = session.id;

    return true;
  }

  private extractToken(req: Request): string | null {
    if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
      return req.cookies[SESSION_COOKIE_NAME];
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}
