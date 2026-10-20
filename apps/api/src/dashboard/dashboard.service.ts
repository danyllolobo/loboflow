import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(orgId: string, userId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalTasksOpen,
      overdueTasks,
      dueTodayTasks,
      upcomingTasks,
      completedRecently,
      activeProjects,
      workloadByMember,
      reviewTasks,
    ] = await Promise.all([
      // Tarefas abertas (não concluídas/canceladas)
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          archivedAt: null,
          status: { category: { notIn: ['DONE', 'CANCELLED'] } },
        },
      }),

      // Atrasadas
      this.prisma.task.findMany({
        where: {
          organizationId: orgId,
          archivedAt: null,
          dueDate: { lt: today },
          status: { category: { notIn: ['DONE', 'CANCELLED'] } },
        },
        include: {
          status: true,
          project: { select: { id: true, name: true } },
          assignees: { include: { user: { select: { id: true, name: true } } } },
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
      }),

      // Vencem hoje
      this.prisma.task.findMany({
        where: {
          organizationId: orgId,
          archivedAt: null,
          dueDate: { gte: today, lte: endOfToday },
          status: { category: { notIn: ['DONE', 'CANCELLED'] } },
        },
        include: {
          status: true,
          project: { select: { id: true, name: true } },
          assignees: { include: { user: { select: { id: true, name: true } } } },
        },
        take: 10,
        orderBy: { priority: 'desc' },
      }),

      // Vencem nos próximos 7 dias
      this.prisma.task.findMany({
        where: {
          organizationId: orgId,
          archivedAt: null,
          dueDate: { gt: endOfToday, lte: nextWeek },
          status: { category: { notIn: ['DONE', 'CANCELLED'] } },
        },
        include: {
          status: true,
          project: { select: { id: true, name: true } },
          assignees: { include: { user: { select: { id: true, name: true } } } },
        },
        take: 10,
        orderBy: { dueDate: 'asc' },
      }),

      // Concluídas nos últimos 30 dias
      this.prisma.task.count({
        where: {
          organizationId: orgId,
          archivedAt: null,
          completedAt: { gte: thirtyDaysAgo },
          status: { category: 'DONE' },
        },
      }),

      // Projetos ativos
      this.prisma.project.findMany({
        where: {
          organizationId: orgId,
          archivedAt: null,
          status: 'ACTIVE',
        },
        include: {
          tasks: {
            select: {
              status: { select: { category: true } },
            },
          },
        },
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),

      // Distribuição de carga de trabalho por responsável
      this.prisma.membership.findMany({
        where: { organizationId: orgId, status: 'ACTIVE' },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              assignments: {
                where: {
                  task: {
                    organizationId: orgId,
                    archivedAt: null,
                    status: { category: { notIn: ['DONE', 'CANCELLED'] } },
                  },
                },
                select: { taskId: true },
              },
            },
          },
        },
      }),

      // Tarefas em revisão
      this.prisma.task.findMany({
        where: {
          organizationId: orgId,
          archivedAt: null,
          status: { category: 'REVIEW' },
        },
        include: {
          status: true,
          project: { select: { id: true, name: true } },
          assignees: { include: { user: { select: { id: true, name: true } } } },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // Formata projetos ativos com percentual de progresso
    const projectsWithProgress = activeProjects.map((p) => {
      const total = p.tasks.length;
      const completed = p.tasks.filter((t) => t.status.category === 'DONE').length;
      const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        id: p.id,
        name: p.name,
        priority: p.priority,
        dueDate: p.dueDate,
        totalTasks: total,
        completedTasks: completed,
        progressPercent,
      };
    });

    // Formata membros com contagem de tarefas abertas
    const workload = workloadByMember.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      openTasksCount: m.user.assignments.length,
    }));

    return {
      summary: {
        totalTasksOpen,
        overdueCount: overdueTasks.length,
        dueTodayCount: dueTodayTasks.length,
        upcomingCount: upcomingTasks.length,
        completedRecently,
        activeProjectsCount: activeProjects.length,
      },
      overdueTasks,
      dueTodayTasks,
      upcomingTasks,
      reviewTasks,
      projects: projectsWithProgress,
      workload,
    };
  }
}
