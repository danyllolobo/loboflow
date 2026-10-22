import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOrganizationInput,
  InviteMemberInput,
  RoleInput,
  UpdateMemberInput,
  UpdateOrganizationInput,
} from '@loboflow/validation';
import { DEFAULT_ROLE_TEMPLATES, DEFAULT_TASK_STATUSES } from '@loboflow/shared';
import { createHash, randomBytes } from 'crypto';
import { ActorType } from '@prisma/client';
import { AuditService } from '../common/audit.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(userId: string, input: CreateOrganizationInput) {
    const baseSlug = input.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'empresa';

    const slug = `${baseSlug}-${randomBytes(3).toString('hex')}`;

    const org = await this.prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          name: input.name,
          slug,
          timezone: input.timezone || 'America/Sao_Paulo',
          enabledModules: [
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
          ],
        },
      });

      let ownerRoleId = '';
      for (const tpl of DEFAULT_ROLE_TEMPLATES) {
        const role = await tx.role.create({
          data: {
            organizationId: createdOrg.id,
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

      let pos = 0;
      for (const st of DEFAULT_TASK_STATUSES) {
        await tx.taskStatus.create({
          data: {
            organizationId: createdOrg.id,
            name: st.name,
            category: st.category,
            color: st.color,
            position: pos++,
            isDefault: st.category === 'TODO' && pos === 1,
          },
        });
      }

      await tx.membership.create({
        data: {
          organizationId: createdOrg.id,
          userId,
          roleId: ownerRoleId,
        },
      });

      return createdOrg;
    });

    await this.auditService.logAudit({
      organizationId: org.id,
      actorType: ActorType.USER,
      actorId: userId,
      action: 'organization.created',
    });

    return org;
  }

  async getOne(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        taskStatuses: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!org) throw new NotFoundException('Organização não encontrada');
    return org;
  }

  async update(orgId: string, actorId: string, input: UpdateOrganizationInput) {
    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: input.name,
        timezone: input.timezone,
        enabledModules: input.enabledModules,
        onboardingCompleted: input.onboardingCompleted,
      },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId,
      action: 'organization.updated',
      metadata: input as any,
    });

    return updated;
  }

  async listMembers(orgId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            theme: true,
          },
        },
        role: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMember(
    orgId: string,
    memberId: string,
    actorId: string,
    input: UpdateMemberInput,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: memberId },
      include: { role: true },
    });

    if (!membership || membership.organizationId !== orgId) {
      throw new NotFoundException('Membro não encontrado nesta organização');
    }

    if (membership.role.isOwner && input.status === 'SUSPENDED') {
      throw new ForbiddenException('Não é permitido suspender o Proprietário da empresa');
    }

    const updated = await this.prisma.membership.update({
      where: { id: memberId },
      data: {
        roleId: input.roleId,
        status: input.status,
        title: input.title,
      },
      include: { role: true, user: true },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId,
      action: 'member.updated',
      entityType: 'Membership',
      entityId: memberId,
    });

    return updated;
  }

  async inviteMember(orgId: string, actorId: string, input: InviteMemberInput) {
    const role = await this.prisma.role.findFirst({
      where: { id: input.roleId, organizationId: orgId },
    });

    if (!role) {
      throw new NotFoundException('Papel selecionado não existe nesta organização');
    }

    const rawToken = randomBytes(24).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: orgId,
        email: input.email.toLowerCase(),
        roleId: input.roleId,
        tokenHash,
        invitedById: actorId,
        expiresAt,
      },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId,
      action: 'member.invited',
      metadata: { email: input.email, role: role.name },
    });

    return {
      id: invitation.id,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      inviteToken: rawToken, // Devolvido para exibição de link / envio de e-mail
    };
  }

  async listRoles(orgId: string) {
    return this.prisma.role.findMany({
      where: { organizationId: orgId },
      include: {
        permissions: true,
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: [{ isOwner: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createRole(orgId: string, actorId: string, input: RoleInput) {
    const role = await this.prisma.role.create({
      data: {
        organizationId: orgId,
        name: input.name,
        description: input.description,
        isOwner: false,
        permissions: {
          create: input.permissions.map((p) => ({
            permissionKey: p.key,
            scope: p.scope ?? 'ALL',
          })),
        },
      },
      include: { permissions: true },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId,
      action: 'role.created',
      entityId: role.id,
      metadata: { name: role.name },
    });

    return role;
  }

  async updateRole(
    orgId: string,
    roleId: string,
    actorId: string,
    input: RoleInput,
  ) {
    const existing = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId: orgId },
    });

    if (!existing) throw new NotFoundException('Papel não encontrado');
    if (existing.isOwner) {
      throw new ForbiddenException('O papel do Proprietário não pode ser modificado');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      return tx.role.update({
        where: { id: roleId },
        data: {
          name: input.name,
          description: input.description,
          permissions: {
            create: input.permissions.map((p) => ({
              permissionKey: p.key,
              scope: p.scope ?? 'ALL',
            })),
          },
        },
        include: { permissions: true },
      });
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId,
      action: 'role.updated',
      entityId: roleId,
    });

    return updated;
  }

  async removeMember(orgId: string, memberId: string, actorId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: memberId },
      include: { role: true, user: true },
    });

    if (!membership || membership.organizationId !== orgId) {
      throw new NotFoundException('Membro não encontrado nesta organização');
    }

    if (membership.role.isOwner) {
      throw new ForbiddenException('Não é permitido remover o Proprietário da empresa');
    }

    if (membership.userId === actorId) {
      throw new ForbiddenException('Você não pode remover a si mesmo da equipe por esta tela');
    }

    await this.prisma.membership.delete({
      where: { id: memberId },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId,
      action: 'member.removed',
      entityType: 'Membership',
      entityId: memberId,
      metadata: { removedUserName: membership.user.name, removedUserEmail: membership.user.email },
    });

    return { success: true, message: 'Membro removido com sucesso' };
  }

  async deleteRole(orgId: string, roleId: string, actorId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId: orgId },
      include: { _count: { select: { memberships: true } } },
    });

    if (!role) {
      throw new NotFoundException('Papel não encontrado');
    }

    if (role.isOwner) {
      throw new ForbiddenException('O papel do Proprietário não pode ser excluído');
    }

    if (role._count.memberships > 0) {
      throw new ConflictException(
        `Não é possível excluir o papel "${role.name}" pois existem ${role._count.memberships} membro(s) vinculados a ele. Reatribua os membros antes de excluir.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });
      await tx.role.delete({ where: { id: roleId } });
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId,
      action: 'role.deleted',
      entityId: roleId,
      metadata: { name: role.name },
    });

    return { success: true, message: 'Papel excluído com sucesso' };
  }

  async revokeInvitation(orgId: string, invitationId: string, actorId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: orgId },
    });

    if (!invitation) {
      throw new NotFoundException('Convite não encontrado');
    }

    await this.prisma.invitation.delete({
      where: { id: invitationId },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId,
      action: 'invitation.revoked',
      entityId: invitationId,
      metadata: { email: invitation.email },
    });

    return { success: true, message: 'Convite revogado com sucesso' };
  }
}
