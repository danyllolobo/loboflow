import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ActiveOrganizationContext, SessionUser } from '@loboflow/shared';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as SessionUser | undefined;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado no contexto de tenant');
    }

    const orgId =
      (request.headers['x-organization-id'] as string) ||
      (request.params?.organizationId as string) ||
      (request.query?.organizationId as string);

    if (!orgId) {
      throw new ForbiddenException('Organização ativa não informada (header x-organization-id)');
    }

    // Busca a organização
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        roles: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organização não encontrada');
    }

    // Busca membership do usuário
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    // Se o usuário é SuperAdmin e não tem membership, verifica se há concessão de suporte ativa
    let isSuperAdminSupport = false;
    if (!membership && user.isSuperAdmin) {
      const grant = await this.prisma.supportAccessGrant.findFirst({
        where: {
          superAdminId: user.id,
          organizationId: orgId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (grant) {
        isSuperAdminSupport = true;
      }
    }

    if (!membership && !isSuperAdminSupport) {
      throw new ForbiddenException('Acesso negado: você não é membro desta organização');
    }

    if (membership && membership.status !== 'ACTIVE' && !user.isSuperAdmin) {
      throw new ForbiddenException('Seu acesso a esta organização foi suspenso');
    }

    if (organization.status === 'SUSPENDED' && !user.isSuperAdmin && !isSuperAdminSupport) {
      throw new ForbiddenException(
        `Esta organização está suspensa: ${organization.suspendedReason || 'Contate o suporte'}`,
      );
    }

    // Mapeia as permissões: chave -> escopo
    const permissionsMap: Record<string, 'ALL' | 'ASSIGNED' | 'OWN'> = {};
    if (membership?.role?.permissions) {
      for (const p of membership.role.permissions) {
        permissionsMap[p.permissionKey] = p.scope as 'ALL' | 'ASSIGNED' | 'OWN';
      }
    } else if (isSuperAdminSupport) {
      // SuperAdmin em suporte tem acesso de visualização / diagnóstico
      permissionsMap['*'] = 'ALL';
    }

    const orgContext: ActiveOrganizationContext = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      timezone: organization.timezone,
      enabledModules: organization.enabledModules,
      onboardingCompleted: organization.onboardingCompleted,
      role: {
        id: membership?.role?.id ?? 'support-role',
        name: membership?.role?.name ?? 'Suporte SuperAdmin',
        isOwner: membership?.role?.isOwner ?? false,
      },
      permissions: permissionsMap,
    };

    (request as any).organizationContext = orgContext;

    return true;
  }
}
