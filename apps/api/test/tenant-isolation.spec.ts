import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Priority } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { TasksService } from '../src/tasks/tasks.service';
import { AuditService } from '../src/common/audit.service';
import { loadEnv, resetEnvCache } from '../src/config/env';
import { randomBytes } from 'crypto';

describe('Isolamento Multi-Tenant e Integridade Relacional', () => {
  let prisma: PrismaClient;
  let authService: AuthService;
  let tasksService: TasksService;
  let auditService: AuditService;

  let orgA: any;
  let userA: any;
  let orgB: any;
  let userB: any;

  beforeAll(async () => {
    resetEnvCache();
    const env = loadEnv();
    prisma = new PrismaClient();
    await prisma.$connect();

    auditService = new AuditService(prisma as any);
    authService = new AuthService(prisma as any, auditService, env);
    tasksService = new TasksService(prisma as any, auditService);

    const suffix = randomBytes(4).toString('hex');

    // Cria Organização A (ex.: LoboAds)
    const regA = await authService.register({
      name: 'User Empresa A',
      email: `empresaA_${suffix}@loboflow.test`,
      password: 'Password123456',
      organizationName: `LoboAds ${suffix}`,
    });
    orgA = regA.organization;
    userA = regA.user;

    // Cria Organização B (ex.: Vitória Colchões)
    const regB = await authService.register({
      name: 'User Empresa B',
      email: `empresaB_${suffix}@loboflow.test`,
      password: 'Password123456',
      organizationName: `Vitoria Colchoes ${suffix}`,
    });
    orgB = regB.organization;
    userB = regB.user;
  });

  afterAll(async () => {
    if (orgA?.id) {
      await prisma.organization.delete({ where: { id: orgA.id } }).catch(() => {});
    }
    if (orgB?.id) {
      await prisma.organization.delete({ where: { id: orgB.id } }).catch(() => {});
    }
    if (userA?.id) {
      await prisma.user.delete({ where: { id: userA.id } }).catch(() => {});
    }
    if (userB?.id) {
      await prisma.user.delete({ where: { id: userB.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('deve criar uma tarefa na Organização A associada estritamente à Organização A', async () => {
    const orgAContext = {
      id: orgA.id,
      name: orgA.name,
      slug: orgA.slug,
      timezone: 'America/Sao_Paulo',
      enabledModules: ['tasks'],
      onboardingCompleted: true,
      role: { id: 'test-role', name: 'Proprietário', isOwner: true },
      permissions: { 'tasks.create': 'ALL' as const, 'tasks.view': 'ALL' as const },
    };

    const task = await tasksService.create(orgAContext, userA.id, {
      title: 'Tarefa confidencial da LoboAds',
      priority: 'HIGH',
      description: 'Dados sigilosos da empresa A',
      assigneeIds: [],
      labelIds: [],
    });

    expect(task).toBeDefined();
    expect(task.organizationId).toBe(orgA.id);
    expect(task.title).toBe('Tarefa confidencial da LoboAds');

    // Tenta consultar a tarefa a partir do contexto da Organização A (deve retornar sucesso)
    const taskFoundInA = await tasksService.getOne(orgA.id, task.id);
    expect(taskFoundInA.id).toBe(task.id);

    // CRÍTICO: Tenta consultar a mesma tarefa a partir do contexto da Organização B
    // Deve lançar NotFoundException (não existe no tenant B)
    await expect(tasksService.getOne(orgB.id, task.id)).rejects.toThrow(
      'Tarefa não encontrada nesta organização',
    );
  });

  it('deve impedir que uma tarefa da Organização A aponte para um Cliente da Organização B (Constraint Relacional Composta)', async () => {
    // Cria cliente na Organização B
    const clientInB = await prisma.client.create({
      data: {
        organizationId: orgB.id,
        name: 'Cliente Exclusivo da Empresa B',
      },
    });

    // Pega um status existente da Org A
    const statusInA = await prisma.taskStatus.findFirst({
      where: { organizationId: orgA.id },
    });

    // Tenta inserir via Prisma uma tarefa pertencente à Org A, mas apontando para o clientId da Org B
    // A chave estrangeira composta [organizationId, clientId] deve rejeitar no PostgreSQL
    await expect(
      prisma.task.create({
        data: {
          organizationId: orgA.id,
          number: 9999,
          title: 'Tentativa de cruzamento de tenants',
          statusId: statusInA!.id,
          clientId: clientInB.id, // ID da Org B com organizationId da Org A!
        },
      }),
    ).rejects.toThrow(); // Rejeição imediata por Foreign Key Constraint Violation no PostgreSQL
  });
});
