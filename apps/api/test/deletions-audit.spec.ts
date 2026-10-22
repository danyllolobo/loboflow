import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { TasksService } from '../src/tasks/tasks.service';
import { ContentScriptsService } from '../src/content-scripts/content-scripts.service';
import { ProjectsService } from '../src/projects/projects.service';
import { ClientsService } from '../src/clients/clients.service';
import { DealsService } from '../src/deals/deals.service';
import { OrganizationsService } from '../src/organizations/organizations.service';
import { AuditService } from '../src/common/audit.service';
import { loadEnv, resetEnvCache } from '../src/config/env';
import { randomBytes } from 'crypto';
import { ForbiddenException } from '@nestjs/common';

describe('Auditoria Completa de Exclusão de Recursos (Tasks, Scripts, Projects, Clients, Deals, Members)', () => {
  let prisma: PrismaClient;
  let authService: AuthService;
  let tasksService: TasksService;
  let scriptsService: ContentScriptsService;
  let projectsService: ProjectsService;
  let clientsService: ClientsService;
  let dealsService: DealsService;
  let orgsService: OrganizationsService;
  let auditService: AuditService;

  let org: any;
  let owner: any;
  let memberUser: any;
  let memberMembership: any;
  let statusList: any[];

  beforeAll(async () => {
    resetEnvCache();
    const env = loadEnv();
    prisma = new PrismaClient();
    await prisma.$connect();

    auditService = new AuditService(prisma as any);
    authService = new AuthService(prisma as any, auditService, env);
    tasksService = new TasksService(prisma as any, auditService);
    scriptsService = new ContentScriptsService(prisma as any);
    projectsService = new ProjectsService(prisma as any, auditService);
    clientsService = new ClientsService(prisma as any, auditService);
    dealsService = new DealsService(prisma as any, auditService);
    orgsService = new OrganizationsService(prisma as any, auditService);

    const suffix = randomBytes(4).toString('hex');

    const reg = await authService.register({
      name: 'Owner Deletion Test',
      email: `owner_${suffix}@loboflow.test`,
      password: 'Password123456',
      organizationName: `Org Deletion ${suffix}`,
    });
    org = reg.organization;
    owner = reg.user;

    statusList = await tasksService.listStatuses(org.id);

    // Cria um membro adicional para testar remoção de membro
    const memberReg = await authService.register({
      name: 'Member To Remove',
      email: `member_${suffix}@loboflow.test`,
      password: 'Password123456',
      organizationName: `Other Org ${suffix}`,
    });
    memberUser = memberReg.user;

    const roles = await orgsService.listRoles(org.id);
    const nonOwnerRole = roles.find((r) => !r.isOwner) || roles[0];

    memberMembership = await prisma.membership.create({
      data: {
        organizationId: org.id,
        userId: memberUser.id,
        roleId: nonOwnerRole.id,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    if (org?.id) {
      await prisma.organization.delete({ where: { id: org.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('1. Deve excluir (soft-delete / arquivar) uma tarefa e omiti-la da listagem ativa', async () => {
    const task = await tasksService.create(
      { id: org.id } as any,
      owner.id,
      {
        title: 'Tarefa para exclusão',
        statusId: statusList[0].id,
      },
    );

    expect(task.id).toBeDefined();

    // Executa a exclusão
    const result = await tasksService.delete(org.id, task.id, owner.id);
    expect(result.archivedAt).not.toBeNull();

    // Verifica que não aparece mais na listagem de ativas
    const activeTasks = await tasksService.list({ id: org.id } as any);
    const found = activeTasks.items.find((t) => t.id === task.id);
    expect(found).toBeUndefined();

    // Verifica que o log de auditoria foi gravado
    const auditLogs = await prisma.auditLog.findMany({
      where: { organizationId: org.id, entityId: task.id, action: 'task.deleted' },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
  });

  it('2. Deve excluir permanentemente uma tarefa se permanent=true', async () => {
    const task = await tasksService.create(
      { id: org.id } as any,
      owner.id,
      {
        title: 'Tarefa permanente',
        statusId: statusList[0].id,
      },
    );

    await tasksService.delete(org.id, task.id, owner.id, true);

    const fromDb = await prisma.task.findUnique({ where: { id: task.id } });
    expect(fromDb).toBeNull();
  });

  it('3. Deve excluir um roteiro (ContentScript) com sucesso', async () => {
    const client = await clientsService.create(org.id, owner.id, {
      name: 'Cliente para Script',
      segment: 'Marketing',
    });

    const script = await scriptsService.create(org.id, owner.id, {
      title: 'Roteiro para exclusão',
      clientId: client.id,
      theme: 'Tema Teste',
      targetDurationSec: 60,
      format: 'REELS' as any,
    });

    const deleted = await scriptsService.delete(org.id, script.id);
    expect(deleted.archivedAt).not.toBeNull();

    const activeList = await scriptsService.list(org.id);
    expect(activeList.find((s) => s.id === script.id)).toBeUndefined();
  });

  it('4. Deve excluir um projeto com sucesso', async () => {
    const project = await projectsService.create(org.id, owner.id, {
      name: 'Projeto para exclusão',
    });

    const deleted = await projectsService.delete(org.id, project.id, owner.id);
    expect(deleted.archivedAt).not.toBeNull();

    const activeList = await projectsService.list(org.id);
    expect(activeList.find((p) => p.id === project.id)).toBeUndefined();
  });

  it('5. Deve excluir um cliente com sucesso', async () => {
    const client = await clientsService.create(org.id, owner.id, {
      name: 'Cliente para exclusão',
      segment: 'Tecnologia',
    });

    const deleted = await clientsService.delete(org.id, client.id, owner.id);
    expect(deleted.archivedAt).not.toBeNull();

    const activeList = await clientsService.list(org.id);
    expect(activeList.find((c) => c.id === client.id)).toBeUndefined();
  });

  it('6. Deve excluir uma oportunidade comercial (Deal) com sucesso', async () => {
    const deal = await dealsService.create(org.id, owner.id, {
      prospectName: 'Oportunidade para exclusão',
      valueCents: 50000,
    });

    const deleted = await dealsService.delete(org.id, deal.id);
    expect(deleted.success).toBe(true);

    const activeList = await dealsService.list(org.id);
    expect(activeList.find((d) => d.id === deal.id)).toBeUndefined();
  });

  it('7. Deve impedir remoção do proprietário da organização', async () => {
    const ownerMembership = await prisma.membership.findFirst({
      where: { organizationId: org.id, userId: owner.id },
    });

    await expect(
      orgsService.removeMember(org.id, ownerMembership!.id, owner.id),
    ).rejects.toThrow(ForbiddenException);
  });

  it('8. Deve remover membro não-proprietário da organização com sucesso', async () => {
    const res = await orgsService.removeMember(org.id, memberMembership.id, owner.id);
    expect(res.success).toBe(true);

    const check = await prisma.membership.findUnique({
      where: { id: memberMembership.id },
    });
    expect(check).toBeNull();
  });
});
