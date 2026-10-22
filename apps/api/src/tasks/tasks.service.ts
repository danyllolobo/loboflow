import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChecklistItemInput,
  CommentInput,
  CreateTaskInput,
  TaskListQuery,
  UpdateTaskInput,
} from '@loboflow/validation';
import { ActiveOrganizationContext, TaskPriority } from '@loboflow/shared';
import { ActorType, Priority, StatusCategory } from '@prisma/client';
import { AuditService } from '../common/audit.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async list(orgContext: ActiveOrganizationContext, query: TaskListQuery = {} as any, userId?: string) {
    const orgId = orgContext.id;
    const where: any = {
      organizationId: orgId,
    };

    if (!query?.includeArchived) {
      where.archivedAt = null;
    }

    if (!query?.includeSubtasks) {
      where.parentId = null;
    }

    // Filtros de escopo RBAC
    const viewScope = orgContext?.permissions?.['tasks.view'] ?? 'ALL';
    if (viewScope === 'ASSIGNED') {
      where.assignees = { some: { userId } };
    } else if (viewScope === 'OWN') {
      where.createdById = userId;
    }

    // Visualizações pré-definidas
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (query.view === 'mine') {
      where.assignees = { some: { userId } };
    } else if (query.view === 'unassigned') {
      where.assignees = { none: {} };
    } else if (query.view === 'overdue') {
      where.dueDate = { lt: today };
      where.status = { category: { notIn: ['DONE', 'CANCELLED'] } };
    } else if (query.view === 'upcoming') {
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.dueDate = { gte: today, lte: nextWeek };
      where.status = { category: { notIn: ['DONE', 'CANCELLED'] } };
    } else if (query.view === 'completed') {
      where.status = { category: 'DONE' };
    }

    // Filtros específicos
    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if (query.statusId) where.statusId = query.statusId;
    if (query.statusCategory) where.status = { category: query.statusCategory };
    if (query.priority) where.priority = query.priority as Priority;
    if (query.assigneeId) where.assignees = { some: { userId: query.assigneeId } };
    if (query.projectId) where.projectId = query.projectId;
    if (query.clientId) where.clientId = query.clientId;
    if (query.labelId) where.labels = { some: { labelId: query.labelId } };

    if (query?.dueFrom || query?.dueTo) {
      where.dueDate = {};
      if (query.dueFrom) where.dueDate.gte = new Date(query.dueFrom);
      if (query.dueTo) where.dueDate.lte = new Date(query.dueTo);
    }

    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(query?.pageSize) || 50));
    const sortField = query?.sort || 'position';
    const sortOrder = query?.order || 'asc';

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          status: true,
          project: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
          assignees: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          labels: { include: { label: true } },
          checklist: { orderBy: { position: 'asc' } },
          _count: {
            select: { comments: true, attachments: true, subtasks: true },
          },
        },
        orderBy: { [sortField]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getOne(orgId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: orgId },
      include: {
        status: true,
        project: true,
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        labels: { include: { label: true } },
        checklist: { orderBy: { position: 'asc' } },
        subtasks: {
          include: {
            status: true,
            assignees: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
        comments: {
          where: { deletedAt: null },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        attachments: {
          where: { deletedAt: null },
          include: { file: true },
        },
      },
    });

    if (!task) throw new NotFoundException('Tarefa não encontrada nesta organização');
    return task;
  }

  async create(
    orgContext: ActiveOrganizationContext,
    actorId: string,
    input: CreateTaskInput,
  ) {
    const orgId = orgContext.id;

    // Se statusId não foi informado, pega o status padrão da organização
    let statusId = input.statusId;
    if (!statusId) {
      const defaultStatus = await this.prisma.taskStatus.findFirst({
        where: { organizationId: orgId, isDefault: true },
      });
      if (!defaultStatus) {
        const firstStatus = await this.prisma.taskStatus.findFirst({
          where: { organizationId: orgId },
          orderBy: { position: 'asc' },
        });
        statusId = firstStatus?.id;
      } else {
        statusId = defaultStatus.id;
      }
    }

    if (!statusId) {
      throw new BadRequestException('A organização não possui status de tarefas configurado');
    }

    // Validação consistente de Projeto e Cliente
    let finalClientId = input.clientId || null;
    let finalProjectId = input.projectId || null;

    if (finalProjectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: finalProjectId, organizationId: orgId, archivedAt: null },
      });
      if (!project) {
        throw new NotFoundException('Projeto não encontrado nesta organização');
      }
      if (project.clientId) {
        if (finalClientId && finalClientId !== project.clientId) {
          throw new BadRequestException('O projeto selecionado pertence a outro cliente.');
        }
        if (!finalClientId) {
          finalClientId = project.clientId;
        }
      }
    }

    if (finalClientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: finalClientId, organizationId: orgId, archivedAt: null },
      });
      if (!client) {
        throw new NotFoundException('Cliente não encontrado nesta organização');
      }
    }

    const task = await this.prisma.$transaction(async (tx) => {
      // Incrementa o número sequencial da empresa
      const updatedOrg = await tx.organization.update({
        where: { id: orgId },
        data: { taskSequence: { increment: 1 } },
        select: { taskSequence: true },
      });

      // Pega a maior posição atual para colocar no final do Kanban
      const lastTask = await tx.task.findFirst({
        where: { organizationId: orgId, statusId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const position = (lastTask?.position ?? 0) + 1000;

      const created = await tx.task.create({
        data: {
          organizationId: orgId,
          number: updatedOrg.taskSequence,
          title: input.title,
          description: input.description,
          statusId,
          priority: (input.priority as Priority) || Priority.MEDIUM,
          projectId: finalProjectId,
          clientId: finalClientId,
          parentId: input.parentId,
          startDate: input.startDate ? new Date(input.startDate) : null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          type: input.type,
          position,
          createdById: actorId,
          assignees: input.assigneeIds?.length
            ? {
                create: input.assigneeIds.map((userId) => ({
                  userId,
                  assignedById: actorId,
                })),
              }
            : undefined,
          labels: input.labelIds?.length
            ? {
                create: input.labelIds.map((labelId) => ({ labelId })),
              }
            : undefined,
        },
        include: {
          status: true,
          assignees: { include: { user: true } },
        },
      });

      // Grava evento no Outbox para automações e notificações
      await tx.outboxEvent.create({
        data: {
          organizationId: orgId,
          type: 'task.created',
          actorId,
          payload: {
            taskId: created.id,
            taskNumber: created.number,
            title: created.title,
            statusId: created.statusId,
            assigneeIds: input.assigneeIds || [],
          },
        },
      });

      return created;
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Task',
      entityId: task.id,
      actorId,
      action: 'task.created',
      changes: { title: task.title, number: task.number },
    });

    return task;
  }

  async update(
    orgId: string,
    taskId: string,
    actorId: string,
    input: UpdateTaskInput,
  ) {
    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: orgId },
      include: { status: true },
    });

    if (!existing) throw new NotFoundException('Tarefa não encontrada');

    // Validação de conclusão
    let completedAt = existing.completedAt;
    if (input.statusId && input.statusId !== existing.statusId) {
      const targetStatus = await this.prisma.taskStatus.findFirst({
        where: { id: input.statusId, organizationId: orgId },
      });
      if (targetStatus?.category === 'DONE' && !completedAt) {
        completedAt = new Date();
      } else if (targetStatus?.category !== 'DONE') {
        completedAt = null;
      }
    }

    // Validação consistente de Projeto e Cliente
    let targetProjectId = input.projectId !== undefined ? (input.projectId || null) : existing.projectId;
    let targetClientId = input.clientId !== undefined ? (input.clientId || null) : existing.clientId;

    if (targetProjectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: targetProjectId, organizationId: orgId, archivedAt: null },
      });
      if (!project) {
        throw new NotFoundException('Projeto não encontrado nesta organização');
      }
      if (project.clientId) {
        if (targetClientId && targetClientId !== project.clientId) {
          throw new BadRequestException('O projeto selecionado pertence a outro cliente.');
        }
        if (!targetClientId) {
          targetClientId = project.clientId;
        }
      }
    }

    if (targetClientId && input.clientId !== undefined && input.clientId !== null) {
      const client = await this.prisma.client.findFirst({
        where: { id: targetClientId, organizationId: orgId, archivedAt: null },
      });
      if (!client) {
        throw new NotFoundException('Cliente não encontrado nesta organização');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Atualiza responsáveis se fornecido
      if (input.assigneeIds) {
        await tx.taskAssignee.deleteMany({ where: { taskId } });
        if (input.assigneeIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: input.assigneeIds.map((userId) => ({
              taskId,
              userId,
              assignedById: actorId,
            })),
          });
        }
      }

      // Atualiza etiquetas se fornecido
      if (input.labelIds) {
        await tx.taskLabel.deleteMany({ where: { taskId } });
        if (input.labelIds.length > 0) {
          await tx.taskLabel.createMany({
            data: input.labelIds.map((labelId) => ({ taskId, labelId })),
          });
        }
      }

      const task = await tx.task.update({
        where: { id: taskId },
        data: {
          title: input.title,
          description: input.description,
          statusId: input.statusId,
          priority: input.priority ? (input.priority as Priority) : undefined,
          projectId: input.projectId !== undefined ? (input.projectId || null) : undefined,
          clientId: input.clientId !== undefined ? (targetClientId || null) : (targetProjectId && targetClientId !== existing.clientId ? targetClientId : undefined),
          startDate: input.startDate !== undefined ? (input.startDate ? new Date(input.startDate) : null) : undefined,
          dueDate: input.dueDate !== undefined ? (input.dueDate ? new Date(input.dueDate) : null) : undefined,
          type: input.type,
          completedAt,
        },
        include: {
          status: true,
          assignees: { include: { user: true } },
          labels: { include: { label: true } },
        },
      });

      await tx.outboxEvent.create({
        data: {
          organizationId: orgId,
          type: 'task.updated',
          actorId,
          payload: {
            taskId: task.id,
            changes: input,
          },
        },
      });

      return task;
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Task',
      entityId: taskId,
      actorId,
      action: 'task.updated',
      changes: input as any,
    });

    return updated;
  }

  async move(
    orgId: string,
    taskId: string,
    actorId: string,
    statusId: string,
    position?: number,
  ) {
    const existing = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: orgId },
      include: { status: true },
    });

    if (!existing) throw new NotFoundException('Tarefa não encontrada');

    const targetStatus = await this.prisma.taskStatus.findFirst({
      where: { id: statusId, organizationId: orgId },
    });

    if (!targetStatus) throw new NotFoundException('Status de destino não encontrado');

    const completedAt =
      targetStatus.category === 'DONE'
        ? existing.completedAt || new Date()
        : null;

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        statusId,
        position: position ?? existing.position,
        completedAt,
      },
      include: { status: true },
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Task',
      entityId: taskId,
      actorId,
      action: 'task.status_changed',
      changes: {
        from: existing.status.name,
        to: targetStatus.name,
        position,
      },
    });

    return updated;
  }

  async addComment(
    orgId: string,
    taskId: string,
    actorId: string,
    input: CommentInput,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: orgId },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    const comment = await this.prisma.comment.create({
      data: {
        organizationId: orgId,
        taskId,
        authorId: actorId,
        body: input.body,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Task',
      entityId: taskId,
      actorId,
      action: 'task.commented',
    });

    return comment;
  }

  async updateComment(
    orgId: string,
    taskId: string,
    commentId: string,
    actorId: string,
    body: string,
  ) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, taskId, organizationId: orgId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado');

    if (comment.authorId !== actorId) {
      throw new ForbiddenException('Você só pode editar seus próprios comentários.');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        body: body.trim(),
        editedAt: new Date(),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deleteComment(
    orgId: string,
    taskId: string,
    commentId: string,
    actorId: string,
    isSuperAdmin?: boolean,
  ) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, taskId, organizationId: orgId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Comentário não encontrado');

    if (comment.authorId !== actorId && !isSuperAdmin) {
      throw new ForbiddenException('Você não tem permissão para excluir este comentário.');
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Task',
      entityId: taskId,
      actorId,
      action: 'task.comment_deleted',
    });

    return { success: true };
  }

  async addChecklistItem(
    orgId: string,
    taskId: string,
    actorId: string,
    input: ChecklistItemInput,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: orgId },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    const count = await this.prisma.checklistItem.count({ where: { taskId } });

    const item = await this.prisma.checklistItem.create({
      data: {
        taskId,
        title: input.title,
        position: count,
      },
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Task',
      entityId: taskId,
      actorId,
      action: 'task.checklist_added',
      changes: { title: input.title },
    });

    return item;
  }

  async updateChecklistItem(
    orgId: string,
    taskId: string,
    itemId: string,
    actorId: string,
    title?: string,
    done?: boolean,
  ) {
    const item = await this.prisma.checklistItem.findFirst({
      where: { id: itemId, taskId, task: { organizationId: orgId } },
    });

    if (!item) throw new NotFoundException('Item de checklist não encontrado');

    const updated = await this.prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        title: title ?? item.title,
        done: done !== undefined ? done : item.done,
        doneAt: done ? new Date() : done === false ? null : item.doneAt,
        doneById: done ? actorId : done === false ? null : item.doneById,
      },
    });

    if (done !== undefined && done !== item.done) {
      await this.auditService.logActivity({
        organizationId: orgId,
        entityType: 'Task',
        entityId: taskId,
        actorId,
        action: done ? 'task.checklist_completed' : 'task.checklist_reopened',
        changes: { title: updated.title, done },
      });
    }

    return updated;
  }

  async deleteChecklistItem(
    orgId: string,
    taskId: string,
    itemId: string,
    actorId: string,
  ) {
    const item = await this.prisma.checklistItem.findFirst({
      where: { id: itemId, taskId, task: { organizationId: orgId } },
    });
    if (!item) throw new NotFoundException('Item de checklist não encontrado');

    await this.prisma.checklistItem.delete({ where: { id: itemId } });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Task',
      entityId: taskId,
      actorId,
      action: 'task.checklist_removed',
      changes: { title: item.title },
    });

    return { success: true };
  }

  async getActivities(orgId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: orgId },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    const activities = await this.prisma.activity.findMany({
      where: { organizationId: orgId, entityType: 'Task', entityId: taskId },
      orderBy: { createdAt: 'desc' },
      take: 60,
    });

    const actorIds = [...new Set(activities.map((a) => a.actorId).filter(Boolean))] as string[];
    const actors = actorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const actorsMap = new Map(actors.map((u) => [u.id, u]));

    return activities.map((a) => ({
      ...a,
      actor: a.actorId ? actorsMap.get(a.actorId) || null : null,
    }));
  }

  async archive(orgId: string, taskId: string, actorId: string) {
    return this.delete(orgId, taskId, actorId, false);
  }

  async delete(orgId: string, taskId: string, actorId: string, permanent = false) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: orgId },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');

    if (permanent) {
      await this.prisma.activity.deleteMany({
        where: { organizationId: orgId, entityType: 'Task', entityId: taskId },
      });
      await this.prisma.task.delete({
        where: { id: taskId },
      });
      await this.auditService.logAudit({
        organizationId: orgId,
        actorType: ActorType.USER,
        actorId,
        action: 'task.deleted_permanently',
        entityType: 'Task',
        entityId: taskId,
        metadata: { title: task.title, number: task.number, permanent: true },
      });
      return { success: true, message: 'Tarefa excluída permanentemente' };
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: { archivedAt: new Date() },
    });

    await this.auditService.logActivity({
      organizationId: orgId,
      entityType: 'Task',
      entityId: taskId,
      actorId,
      action: 'task.archived',
      changes: { title: task.title, number: task.number },
    });

    await this.auditService.logAudit({
      organizationId: orgId,
      actorType: ActorType.USER,
      actorId,
      action: 'task.deleted',
      entityType: 'Task',
      entityId: taskId,
      metadata: { title: task.title, number: task.number, permanent: false },
    });

    return updated;
  }

  async listStatuses(orgId: string) {
    return this.prisma.taskStatus.findMany({
      where: { organizationId: orgId, archivedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async createStatus(
    orgId: string,
    input: { name: string; color?: string; category?: StatusCategory },
  ) {
    const count = await this.prisma.taskStatus.count({
      where: { organizationId: orgId, archivedAt: null },
    });

    return this.prisma.taskStatus.create({
      data: {
        organizationId: orgId,
        name: input.name,
        color: input.color || '#3b82f6',
        category: input.category || StatusCategory.IN_PROGRESS,
        position: count + 1,
      },
    });
  }

  async updateStatus(
    orgId: string,
    statusId: string,
    input: { name?: string; color?: string; category?: StatusCategory },
  ) {
    const status = await this.prisma.taskStatus.findFirst({
      where: { id: statusId, organizationId: orgId },
    });
    if (!status) throw new NotFoundException('Status não encontrado');

    return this.prisma.taskStatus.update({
      where: { id: statusId },
      data: {
        name: input.name ?? status.name,
        color: input.color ?? status.color,
        category: input.category ?? status.category,
      },
    });
  }

  async deleteStatus(orgId: string, statusId: string) {
    const status = await this.prisma.taskStatus.findFirst({
      where: { id: statusId, organizationId: orgId },
    });
    if (!status) throw new NotFoundException('Status não encontrado');

    const tasksCount = await this.prisma.task.count({
      where: { statusId, organizationId: orgId, archivedAt: null },
    });

    if (tasksCount > 0) {
      throw new BadRequestException(
        `Não é possível excluir esta coluna pois há ${tasksCount} tarefa(s) vinculadas a ela. Mova as tarefas antes de excluir.`,
      );
    }

    return this.prisma.taskStatus.update({
      where: { id: statusId },
      data: { archivedAt: new Date() },
    });
  }
}

