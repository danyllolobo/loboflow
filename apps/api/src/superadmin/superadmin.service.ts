import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminCreateOrganizationInput,
  AdminStatusChangeInput,
  AdminUpdateOrganizationInput,
  FeatureFlagInput,
  PlanInput,
  SupportGrantInput,
} from '@loboflow/validation';
import { DEFAULT_ROLE_TEMPLATES, DEFAULT_TASK_STATUSES } from '@loboflow/shared';
import { hash } from '@node-rs/argon2';
import { randomBytes } from 'crypto';
import { ActorType } from '@prisma/client';
import { AuditService } from '../common/audit.service';

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
              select: { id: true, name: true, email: true, lastLoginAt: true },
            },
            role: true,
          },
        },
        featureOverrides: true,
      },
    });

    if (!org) throw new NotFoundException('Organização não encontrada');
    return org;
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
