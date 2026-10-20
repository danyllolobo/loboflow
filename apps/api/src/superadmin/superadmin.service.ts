import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminCreateOrganizationInput,
  AdminCreateUserInput,
  AdminResetPasswordInput,
  AdminStatusChangeInput,
  AdminUpdateOrganizationInput,
  AdminUpdateUserInput,
  SupportGrantInput,
} from '@loboflow/validation';
import { DEFAULT_ROLE_TEMPLATES, DEFAULT_TASK_STATUSES } from '@loboflow/shared';
import { hash } from '@node-rs/argon2';
import { randomBytes } from 'crypto';
import { ActorType } from '@prisma/client';
import { AuditService } from '../common/audit.service';

export const SYSTEM_MODULES = [
  { id: 'dashboard', name: 'Dashboard Executivo', description: 'Painel com métricas gerais, KPIs e funil operacional' },
  { id: 'tasks', name: 'Tarefas & Kanban', description: 'Gestão de demandas com checklists, responsáveis e pipelines customizáveis' },
  { id: 'projects', name: 'Gestão de Projetos', description: 'Metas, prazos, entregáveis e orçamentos agrupados por cliente' },
  { id: 'clients', name: 'Carteira de Clientes', description: 'Gestão de contas, particularidades de marketing e tom de voz' },
  { id: 'team', name: 'Equipe & Colaboradores', description: 'Controle de membros, cargos e estrutura de permissões RBAC' },
  { id: 'scripts', name: 'Roteiros & Estúdio', description: 'Criação de scripts para vídeos e posts com versionamento' },
  { id: 'commercial', name: 'Comercial & CRM', description: 'Funil de vendas Kanban, negociações e registro de interações' },
  { id: 'contracts', name: 'Contratos & Jurídico', description: 'Gestão de minutas, vigências contratuais e renovações' },
  { id: 'automations', name: 'Automações & Webhooks', description: 'Gatilhos automáticos de tarefas, notificações e eventos outbox' },
  { id: 'ai', name: 'Jarvis IA Operacional', description: 'Assistente executivo inteligente multi-provedor (Gemini / OpenAI)' },
];

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getMetrics() {
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalTasks,
      totalProjects,
      totalAiUsage,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count(),
      this.prisma.task.count(),
      this.prisma.project.count(),
      this.prisma.aiUsage.aggregate({
        _sum: { inputTokens: true, outputTokens: true },
        _count: { id: true },
      }),
    ]);

    return {
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      totalTasks,
      totalProjects,
      ai: {
        totalCalls: totalAiUsage._count.id,
        totalTokens:
          (totalAiUsage._sum.inputTokens || 0) + (totalAiUsage._sum.outputTokens || 0),
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /* CONTAS / ORGANIZAÇÕES (TENANTS)                                    */
  /* ------------------------------------------------------------------ */

  async listOrganizations(search?: string) {
    return this.prisma.organization.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        plan: true,
        _count: {
          select: {
            memberships: true,
            tasks: true,
            projects: true,
            clients: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        plan: true,
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, lastLoginAt: true, isSuperAdmin: true, disabledAt: true },
            },
            role: true,
          },
        },
        featureOverrides: true,
        _count: {
          select: {
            tasks: true,
            projects: true,
            clients: true,
            scripts: true,
            deals: true,
          },
        },
      },
    });

    if (!org) throw new NotFoundException('Organização não encontrada');
    return org;
  }

  async createOrganization(superAdminId: string, input: AdminCreateOrganizationInput) {
    const slugBase = input.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'org';
    const slug = `${slugBase}-${randomBytes(2).toString('hex')}`;

    const defaultModules = [
      'dashboard',
      'tasks',
      'projects',
      'clients',
      'team',
      'documents',
      'scripts',
      'commercial',
      'contracts',
      'reports',
      'automations',
      'integrations',
      'ai',
      'settings',
    ];

    let planId: string | null = null;
    if (input.planCode) {
      const plan = await this.prisma.plan.findUnique({ where: { code: input.planCode } });
      if (plan) planId = plan.id;
    }

    const org = await this.prisma.$transaction(async (tx) => {
      // 1. Cria ou obtém o usuário proprietário
      let owner = await tx.user.findUnique({ where: { email: input.ownerEmail } });
      if (!owner) {
        const defaultPasswordHash = await hash('Mudar@123', {
          memoryCost: 19456,
          timeCost: 2,
          outputLen: 32,
          parallelism: 1,
        });
        owner = await tx.user.create({
          data: {
            name: input.ownerName || input.name,
            email: input.ownerEmail,
            passwordHash: defaultPasswordHash,
          },
        });
      }

      // 2. Cria a organização
      const newOrg = await tx.organization.create({
        data: {
          name: input.name,
          slug,
          planId,
          enabledModules: defaultModules,
        },
      });

      // 3. Cria os papéis RBAC padrão
      let ownerRoleId = '';
      for (const tpl of DEFAULT_ROLE_TEMPLATES) {
        const role = await tx.role.create({
          data: {
            organizationId: newOrg.id,
            key: tpl.key,
            name: tpl.name,
            description: tpl.description,
            isOwner: !!tpl.isOwner,
            permissions: {
              create: tpl.permissions.map((p) => ({
                permissionKey: p.key,
                scope: p.scope ?? 'ALL',
              })),
            },
          },
        });
        if (tpl.isOwner) ownerRoleId = role.id;
      }

      // 4. Cria status padrão do Kanban
      let pos = 0;
      for (const st of DEFAULT_TASK_STATUSES) {
        await tx.taskStatus.create({
          data: {
            organizationId: newOrg.id,
            name: st.name,
            category: st.category,
            color: st.color,
            position: pos++,
            isDefault: st.category === 'TODO' && pos === 1,
          },
        });
      }

      // 5. Vincula o usuário como Proprietário
      await tx.membership.create({
        data: {
          userId: owner.id,
          organizationId: newOrg.id,
          roleId: ownerRoleId,
        },
      });

      return newOrg;
    });

    await this.auditService.logAudit({
      organizationId: org.id,
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.organization.created',
      metadata: { name: org.name, slug: org.slug, ownerEmail: input.ownerEmail },
    });

    return org;
  }

  async updateOrganization(
    id: string,
    superAdminId: string,
    input: AdminUpdateOrganizationInput & {
      slug?: string;
      status?: 'ACTIVE' | 'SUSPENDED';
      timezone?: string;
    },
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organização não encontrada');

    let planId = org.planId;
    if (input.planCode !== undefined) {
      if (input.planCode) {
        const plan = await this.prisma.plan.findUnique({ where: { code: input.planCode } });
        if (plan) planId = plan.id;
      } else {
        planId = null;
      }
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        name: input.name ?? org.name,
        slug: input.slug ?? org.slug,
        status: input.status ? (input.status as any) : org.status,
        timezone: input.timezone ?? org.timezone,
        planId,
        enabledModules: input.enabledModules ?? org.enabledModules,
      },
    });

    await this.auditService.logAudit({
      organizationId: id,
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.organization.updated',
      metadata: { changes: input },
    });

    return updated;
  }

  async deleteOrganization(id: string, superAdminId: string, confirmName: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organização não encontrada');

    if (confirmName.trim() !== org.name.trim()) {
      throw new BadRequestException('O nome de confirmação não confere com o da organização');
    }

    await this.prisma.organization.delete({ where: { id } });

    await this.auditService.logAudit({
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.organization.deleted',
      metadata: { organizationId: id, name: org.name, slug: org.slug },
    });

    return { success: true, message: `Organização "${org.name}" excluída com sucesso.` };
  }

  async setOrganizationModules(id: string, superAdminId: string, modules: string[]) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organização não encontrada');

    const updated = await this.prisma.organization.update({
      where: { id },
      data: { enabledModules: modules },
    });

    await this.auditService.logAudit({
      organizationId: id,
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.organization.modules_updated',
      metadata: { enabledModules: modules },
    });

    return updated;
  }

  async suspendOrganization(
    id: string,
    superAdminId: string,
    input: AdminStatusChangeInput,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) throw new NotFoundException('Organização não encontrada');

    if (input.confirm.trim() !== org.name.trim()) {
      throw new BadRequestException('O nome de confirmação não confere com o da organização');
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        suspendedReason: input.reason,
      },
    });

    await this.auditService.logAudit({
      organizationId: id,
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.organization.suspended',
      metadata: { reason: input.reason },
    });

    return updated;
  }

  async activateOrganization(id: string, superAdminId: string) {
    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        suspendedReason: null,
      },
    });

    await this.auditService.logAudit({
      organizationId: id,
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.organization.activated',
    });

    return updated;
  }

  /* ------------------------------------------------------------------ */
  /* USUÁRIOS GLOBAIS                                                   */
  /* ------------------------------------------------------------------ */

  async listUsers(search?: string) {
    return this.prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        disabledAt: true,
        lastLoginAt: true,
        createdAt: true,
        memberships: {
          select: {
            id: true,
            organization: {
              select: { id: true, name: true, slug: true, status: true },
            },
            role: {
              select: { id: true, name: true, isOwner: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUser(superAdminId: string, input: AdminCreateUserInput) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException('Já existe um usuário cadastrado com este e-mail');
    }

    const passwordHash = await hash(input.password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          isSuperAdmin: input.isSuperAdmin ?? false,
        },
      });

      if (input.organizationId) {
        // Obter ou criar role
        let roleId = input.roleId;
        if (!roleId) {
          const defaultRole = await tx.role.findFirst({
            where: { organizationId: input.organizationId },
            orderBy: { isOwner: 'asc' },
          });
          if (defaultRole) roleId = defaultRole.id;
        }

        if (roleId) {
          await tx.membership.create({
            data: {
              userId: created.id,
              organizationId: input.organizationId,
              roleId,
            },
          });
        }
      }

      return created;
    });

    await this.auditService.logAudit({
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.user.created',
      metadata: { userId: user.id, email: user.email, isSuperAdmin: user.isSuperAdmin },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      createdAt: user.createdAt,
    };
  }

  async updateUser(id: string, superAdminId: string, input: AdminUpdateUserInput) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name: input.name ?? user.name,
        email: input.email ?? user.email,
        isSuperAdmin: input.isSuperAdmin !== undefined ? input.isSuperAdmin : user.isSuperAdmin,
        disabledAt:
          input.disabled === true
            ? new Date()
            : input.disabled === false
              ? null
              : user.disabledAt,
      },
    });

    await this.auditService.logAudit({
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.user.updated',
      metadata: { targetUserId: id, changes: input },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      isSuperAdmin: updated.isSuperAdmin,
      disabledAt: updated.disabledAt,
    };
  }

  async resetUserPassword(id: string, superAdminId: string, input: AdminResetPasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const passwordHash = await hash(input.newPassword, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Revoga sessões ativas
    await this.prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditService.logAudit({
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.user.password_reset',
      metadata: { targetUserId: id },
    });

    return { success: true, message: 'Senha redefinida e sessões ativas revogadas com sucesso.' };
  }

  async deleteUser(id: string, superAdminId: string) {
    if (id === superAdminId) {
      throw new BadRequestException('Você não pode excluir sua própria conta de SuperAdmin.');
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.prisma.user.delete({ where: { id } });

    await this.auditService.logAudit({
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.user.deleted',
      metadata: { deletedUserId: id, email: user.email },
    });

    return { success: true, message: `Usuário "${user.name}" excluído com sucesso.` };
  }

  /* ------------------------------------------------------------------ */
  /* MÓDULOS DO SISTEMA                                                 */
  /* ------------------------------------------------------------------ */

  async listModules() {
    const orgs = await this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        enabledModules: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      modules: SYSTEM_MODULES,
      accounts: orgs,
    };
  }

  /* ------------------------------------------------------------------ */
  /* SUPORTE & AUDITORIA                                                */
  /* ------------------------------------------------------------------ */

  async createSupportGrant(
    superAdminId: string,
    orgId: string,
    input: SupportGrantInput,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organização não encontrada');

    const expiresAt = new Date(Date.now() + input.durationMinutes * 60 * 1000);

    const grant = await this.prisma.supportAccessGrant.create({
      data: {
        superAdminId,
        organizationId: orgId,
        reason: input.reason,
        expiresAt,
      },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.support_access.granted',
      metadata: {
        durationMinutes: input.durationMinutes,
        reason: input.reason,
        expiresAt,
      },
    });

    return grant;
  }

  async revokeSupportGrant(superAdminId: string, grantId: string) {
    const grant = await this.prisma.supportAccessGrant.update({
      where: { id: grantId },
      data: { revokedAt: new Date() },
    });

    await this.auditService.logAudit({
      organizationId: grant.organizationId,
      actorType: ActorType.SUPERADMIN,
      actorId: superAdminId,
      action: 'superadmin.support_access.revoked',
      entityId: grantId,
    });

    return grant;
  }

  async listAuditLogs(orgId?: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}
