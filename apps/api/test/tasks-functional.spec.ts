import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';
import { TasksService } from '../src/tasks/tasks.service';
import { AuditService } from '../src/common/audit.service';
import { loadEnv, resetEnvCache } from '../src/config/env';
import { randomBytes } from 'crypto';
import { BadRequestException } from '@nestjs/common';

describe('Tarefas — Correções de Data e Relacionamento Inteligente Cliente/Projeto', () => {
  let prisma: PrismaClient;
  let authService: AuthService;
  let tasksService: TasksService;
  let auditService: AuditService;

  let org: any;
  let user: any;
  let orgContext: any;
  let clientA: any;
  let clientB: any;
  let projectA: any; // Pertence ao clientA
  let projectWithoutClient: any; // Sem cliente

  beforeAll(async () => {
    resetEnvCache();
    const env = loadEnv();
    prisma = new PrismaClient();
    await prisma.$connect();

    auditService = new AuditService(prisma as any);
    authService = new AuthService(prisma as any, auditService, env);
    tasksService = new TasksService(prisma as any, auditService);

    const suffix = randomBytes(4).toString('hex');

    const reg = await authService.register({
      name: 'Tester LoboFlow',
      email: `tester_${suffix}@loboflow.test`,
      password: 'Password123456',
      organizationName: `Org Test ${suffix}`,
    });
    org = reg.organization;
    user = reg.user;

    orgContext = {
      id: org.id,
      name: org.name,
      slug: org.slug,
      timezone: 'America/Sao_Paulo',
      enabledModules: ['tasks'],
      onboardingCompleted: true,
      role: { id: 'test-role', name: 'Proprietário', isOwner: true },
      permissions: {
        'tasks.create': 'ALL' as const,
        'tasks.view': 'ALL' as const,
        'tasks.edit': 'ALL' as const,
        'tasks.delete': 'ALL' as const,
      },
    };

    // Criar Cliente A e Cliente B
    clientA = await prisma.client.create({
      data: {
        organizationId: org.id,
        name: `Cliente A ${suffix}`,
      },
    });

    clientB = await prisma.client.create({
      data: {
        organizationId: org.id,
        name: `Cliente B ${suffix}`,
      },
    });

    // Criar Projeto A vinculado ao Cliente A
    projectA = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: `Projeto do Cliente A ${suffix}`,
        clientId: clientA.id,
      },
    });

    // Criar Projeto sem cliente
    projectWithoutClient = await prisma.project.create({
      data: {
        organizationId: org.id,
        name: `Projeto Geral Sem Cliente ${suffix}`,
      },
    });
  });

  afterAll(async () => {
    if (org?.id) {
      await prisma.organization.delete({ where: { id: org.id } }).catch(() => {});
    }
    if (user?.id) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('1. Criação, Edição, Alteração e Remoção de Prazo (dueDate)', () => {
    it('deve criar uma tarefa sem data com sucesso', async () => {
      const task = await tasksService.create(orgContext, user.id, {
        title: 'Tarefa criada inicialmente sem data',
        priority: 'MEDIUM',
        description: 'Descrição original que deve ser preservada',
      });

      expect(task).toBeDefined();
      expect(task.dueDate).toBeNull();
      expect(task.title).toBe('Tarefa criada inicialmente sem data');
      expect(task.description).toBe('Descrição original que deve ser preservada');

      const fetched = await tasksService.getOne(org.id, task.id);
      expect(fetched.dueDate).toBeNull();
    });

    it('deve adicionar uma data a uma tarefa sem data e persistir corretamente', async () => {
      const created = await tasksService.create(orgContext, user.id, {
        title: 'Tarefa para adicionar data',
        priority: 'HIGH',
        description: 'Contexto importante',
      });

      expect(created.dueDate).toBeNull();

      // Edita adicionando a data "2026-10-25"
      const updated = await tasksService.update(org.id, created.id, user.id, {
        dueDate: '2026-10-25',
      });

      expect(updated.dueDate).toBeDefined();
      // Verifica que o YYYY-MM-DD é exatamente 2026-10-25 sem deslocamento de 1 dia
      const isoDate = new Date(updated.dueDate!).toISOString().split('T')[0];
      expect(isoDate).toBe('2026-10-25');

      // Verifica que os demais campos foram preservados
      expect(updated.title).toBe('Tarefa para adicionar data');
      expect(updated.priority).toBe('HIGH');
      expect(updated.description).toBe('Contexto importante');

      // Reabre a tarefa do banco para garantir persistência real
      const reloaded = await tasksService.getOne(org.id, created.id);
      const reloadedDate = new Date(reloaded.dueDate!).toISOString().split('T')[0];
      expect(reloadedDate).toBe('2026-10-25');
    });

    it('deve permitir alterar a data existente para outra data', async () => {
      const created = await tasksService.create(orgContext, user.id, {
        title: 'Tarefa com data mutável',
        priority: 'LOW',
        dueDate: '2026-10-25',
      });

      expect(new Date(created.dueDate!).toISOString().split('T')[0]).toBe('2026-10-25');

      // Altera para 2026-11-15
      const updated = await tasksService.update(org.id, created.id, user.id, {
        dueDate: '2026-11-15',
      });

      expect(new Date(updated.dueDate!).toISOString().split('T')[0]).toBe('2026-11-15');

      const reloaded = await tasksService.getOne(org.id, created.id);
      expect(new Date(reloaded.dueDate!).toISOString().split('T')[0]).toBe('2026-11-15');
      expect(reloaded.title).toBe('Tarefa com data mutável');
    });

    it('deve permitir remover a data existente (setar como null)', async () => {
      const created = await tasksService.create(orgContext, user.id, {
        title: 'Tarefa com data a remover',
        priority: 'MEDIUM',
        dueDate: '2026-10-25',
      });

      expect(created.dueDate).not.toBeNull();

      // Remove a data enviando null
      const updated = await tasksService.update(org.id, created.id, user.id, {
        dueDate: null,
      });

      expect(updated.dueDate).toBeNull();

      const reloaded = await tasksService.getOne(org.id, created.id);
      expect(reloaded.dueDate).toBeNull();
      expect(reloaded.title).toBe('Tarefa com data a remover');
    });
  });

  describe('2. Inteligência e Consistência dos campos Cliente e Projeto', () => {
    it('ao criar tarefa com projeto vinculado ao Cliente A, auto-preenche clientId com Cliente A', async () => {
      const task = await tasksService.create(orgContext, user.id, {
        title: 'Tarefa com Projeto A sem informar cliente explicitamente',
        priority: 'MEDIUM',
        projectId: projectA.id,
      });

      expect(task.projectId).toBe(projectA.id);
      expect(task.clientId).toBe(clientA.id);

      const reloaded = await tasksService.getOne(org.id, task.id);
      expect(reloaded.clientId).toBe(clientA.id);
      expect(reloaded.project?.name).toContain('Projeto do Cliente A');
    });

    it('ao criar tarefa com projeto vinculado ao Cliente A e Cliente A informado, valida com sucesso', async () => {
      const task = await tasksService.create(orgContext, user.id, {
        title: 'Tarefa coerente Cliente A e Projeto A',
        priority: 'MEDIUM',
        projectId: projectA.id,
        clientId: clientA.id,
      });

      expect(task.projectId).toBe(projectA.id);
      expect(task.clientId).toBe(clientA.id);
    });

    it('ao criar tarefa com projeto vinculado ao Cliente A mas passando Cliente B, rejeita com BadRequestException', async () => {
      await expect(
        tasksService.create(orgContext, user.id, {
          title: 'Tentativa incoerente: Projeto de A com Cliente B',
          priority: 'MEDIUM',
          projectId: projectA.id,
          clientId: clientB.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ao atualizar tarefa para um projeto incompatível com o cliente atual, rejeita com BadRequestException', async () => {
      const task = await tasksService.create(orgContext, user.id, {
        title: 'Tarefa inicial para teste de atualização',
        priority: 'MEDIUM',
        clientId: clientB.id,
      });

      await expect(
        tasksService.update(org.id, task.id, user.id, {
          projectId: projectA.id, // Pertence a A, mas a tarefa pertence a B
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ao atualizar projeto e sincronizar cliente compatível, salva com sucesso', async () => {
      const task = await tasksService.create(orgContext, user.id, {
        title: 'Tarefa para troca de cliente e projeto',
        priority: 'MEDIUM',
        clientId: clientB.id,
      });

      const updated = await tasksService.update(org.id, task.id, user.id, {
        projectId: projectA.id,
        clientId: clientA.id,
      });

      expect(updated.projectId).toBe(projectA.id);
      expect(updated.clientId).toBe(clientA.id);
    });

    it('permite tarefas com projetos gerais sem cliente vinculado', async () => {
      const task = await tasksService.create(orgContext, user.id, {
        title: 'Tarefa em projeto geral sem cliente',
        priority: 'LOW',
        projectId: projectWithoutClient.id,
      });

      expect(task.projectId).toBe(projectWithoutClient.id);
      expect(task.clientId).toBeNull();
    });
  });

  describe('3. Subtarefas (Checklist), Comentários e Timeline de Atividades', () => {
    let taskForItems: any;

    beforeAll(async () => {
      taskForItems = await tasksService.create(orgContext, user.id, {
        title: 'Tarefa para testes de Checklist e Comentários',
        priority: 'HIGH',
      });
    });

    it('deve adicionar, editar, alternar e excluir itens do checklist', async () => {
      // 1. Adicionar item
      const item = await tasksService.addChecklistItem(org.id, taskForItems.id, user.id, {
        title: 'Etapa inicial: Criar layout',
      });
      expect(item).toBeDefined();
      expect(item.title).toBe('Etapa inicial: Criar layout');
      expect(item.done).toBe(false);

      // 2. Alternar para concluído
      const toggled = await tasksService.updateChecklistItem(
        org.id,
        taskForItems.id,
        item.id,
        user.id,
        undefined,
        true,
      );
      expect(toggled.done).toBe(true);
      expect(toggled.doneAt).toBeDefined();
      expect(toggled.doneById).toBe(user.id);

      // 3. Renomear item
      const renamed = await tasksService.updateChecklistItem(
        org.id,
        taskForItems.id,
        item.id,
        user.id,
        'Etapa inicial: Criar layout e protótipo',
      );
      expect(renamed.title).toBe('Etapa inicial: Criar layout e protótipo');

      // 4. Excluir item
      const deleted = await tasksService.deleteChecklistItem(
        org.id,
        taskForItems.id,
        item.id,
        user.id,
      );
      expect(deleted.success).toBe(true);

      const reloaded = await tasksService.getOne(org.id, taskForItems.id);
      expect(reloaded.checklist.find((i: any) => i.id === item.id)).toBeUndefined();
    });

    it('deve adicionar, editar e excluir comentários da tarefa', async () => {
      // 1. Criar comentário
      const comment = await tasksService.addComment(org.id, taskForItems.id, user.id, {
        body: 'Alinhamento inicial: precisamos validar o protótipo com o cliente @Pedro',
      });
      expect(comment).toBeDefined();
      expect(comment.body).toContain('@Pedro');
      expect(comment.authorId).toBe(user.id);

      // 2. Editar comentário
      const updated = await tasksService.updateComment(
        org.id,
        taskForItems.id,
        comment.id,
        user.id,
        'Alinhamento atualizado: protótipo aprovado!',
      );
      expect(updated.body).toBe('Alinhamento atualizado: protótipo aprovado!');
      expect(updated.editedAt).toBeDefined();

      // 3. Excluir comentário
      const deleted = await tasksService.deleteComment(
        org.id,
        taskForItems.id,
        comment.id,
        user.id,
      );
      expect(deleted.success).toBe(true);

      const reloaded = await tasksService.getOne(org.id, taskForItems.id);
      expect(reloaded.comments.find((c: any) => c.id === comment.id)).toBeUndefined();
    });

    it('deve retornar o histórico de atividades e auditoria da tarefa', async () => {
      const activities = await tasksService.getActivities(org.id, taskForItems.id);
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);

      // Deve conter ações como task.created, task.checklist_added, etc.
      const actions = activities.map((a: any) => a.action);
      expect(actions).toContain('task.created');
      expect(actions).toContain('task.checklist_added');
    });
  });
});
