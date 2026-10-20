import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectInput, UpdateProjectInput } from '@loboflow/validation';
import { Priority, ProjectStatus } from '@prisma/client';
import { AuditService } from '../common/audit.service';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(orgId: string, status?: ProjectStatus) {
    const projects = await this.prisma.project.findMany({
      where: {
        organizationId: orgId,
        archivedAt: null,
        status: status ? status : undefined,
      },
      include: {
        client: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { tasks: true },
        },
        tasks: {
          select: {
            id: true,
            status: { select: { category: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcula progresso dinâmico para cada projeto
    return projects.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter(
        (t) => t.status.category === 'DONE',
      ).length;
      const progressPercent =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      const { tasks, ...rest } = p;
      return {
        ...rest,
        totalTasks,
        completedTasks,
        progressPercent,
      };
    });
  }

  async getOne(orgId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, organizationId: orgId },
      include: {
        client: true,
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        tasks: {
          where: { archivedAt: null },
          include: {
            status: true,
            assignees: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
          orderBy: { position: 'asc' },
        },
        documents: {
          where: { deletedAt: null },
        },
        comments: {
          where: { deletedAt: null },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!project) throw new NotFoundException('Projeto não encontrado');

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(
      (t) => t.status.category === 'DONE',
    ).length;
    const progressPercent =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      ...project,
      totalTasks,
      completedTasks,
      progressPercent,
    };
  }

  async create(orgId: string, actorId: string, input: CreateProjectInput) {
    const project = await this.prisma.project.create({
      data: {
        organizationId: orgId,
        name: input.name,
        description: input.description,
        clientId: input.clientId,
        ownerId: input.ownerId || actorId,
        status: (input.status as ProjectStatus) || ProjectStatus.ACTIVE,
        priority: (input.priority as Priority) || Priority.MEDIUM,
        startDate: input.startDate ? new Date(input.startDate) : null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        createdById: actorId,
        members: input.memberIds?.length
          ? {
              create: input.memberIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        client: true,
        owner: true,
      },
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Project',
      entityId: project.id,
      actorId,
      action: 'project.created',
      changes: { name: project.name },
    });

    return project;
  }

  async update(
    orgId: string,
    id: string,
    actorId: string,
    input: UpdateProjectInput,
  ) {
    const existing = await this.prisma.project.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) throw new NotFoundException('Projeto não encontrado');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (input.memberIds) {
        await tx.projectMember.deleteMany({ where: { projectId: id } });
        if (input.memberIds.length > 0) {
          await tx.projectMember.createMany({
            data: input.memberIds.map((userId) => ({ projectId: id, userId })),
          });
        }
      }

      return tx.project.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          clientId: input.clientId,
          ownerId: input.ownerId,
          status: input.status ? (input.status as ProjectStatus) : undefined,
          priority: input.priority ? (input.priority as Priority) : undefined,
          startDate: input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : undefined,
          dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : undefined,
        },
        include: {
          client: true,
          owner: true,
          members: { include: { user: true } },
        },
      });
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Project',
      entityId: id,
      actorId,
      action: 'project.updated',
      changes: input as any,
    });

    return updated;
  }

  async archive(orgId: string, id: string, actorId: string) {
    const existing = await this.prisma.project.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!existing) throw new NotFoundException('Projeto não encontrado');

    const updated = await this.prisma.project.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Project',
      entityId: id,
      actorId,
      action: 'project.archived',
    });

    return updated;
  }
}
