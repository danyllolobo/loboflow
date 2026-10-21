import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JarvisChatInput, JarvisChatResponse, JarvisReference, JarvisToolExecutionResult } from './ai.types';
import { AiMessageRole, AiExecutionStatus } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly prisma: PrismaService) {}

  async chat(
    orgId: string,
    userId: string,
    input: JarvisChatInput,
  ): Promise<JarvisChatResponse> {
    const text = input.message.trim();

    // 1. Busca ou cria conversa no banco
    let conversation = input.conversationId
      ? await this.prisma.aiConversation.findFirst({
          where: { id: input.conversationId, organizationId: orgId, userId },
        })
      : null;

    if (!conversation) {
      conversation = await this.prisma.aiConversation.create({
        data: {
          organizationId: orgId,
          userId,
          title: text.slice(0, 40) || 'Nova Conversa',
        },
      });
    }

    // 2. Salva a mensagem do usuário
    await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiMessageRole.USER,
        content: text,
      },
    });

    // 3. Processamento com Tools e/ou LLM
    let reply = '';
    let toolExecution: JarvisToolExecutionResult | undefined;
    let references: JarvisReference[] = [];

    const lower = text.toLowerCase();

    // TOOL: Criar tarefa via Jarvis (ex: "criar tarefa [nome]", "adicionar demanda [nome]", "nova tarefa [nome]")
    const createTaskMatch = text.match(/(?:criar|nova|adicionar|agendar)\s+(?:tarefa|demanda|card)\s+["']?([^"'\n]+?)["']?(?:\s+(?:com\s+prioridade|prioridade)\s+(alta|urgente|media|baixa))?(?:\s+para\s+(?:o\s+projeto|projeto)\s+["']?([^"'\n]+?)["']?)?$/i);

    if (createTaskMatch && createTaskMatch[1]) {
      const taskTitle = createTaskMatch[1].trim();
      const rawPriority = createTaskMatch[2]?.toLowerCase();
      const projectName = createTaskMatch[3]?.trim();

      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'MEDIUM';
      if (rawPriority === 'urgente') priority = 'URGENT';
      else if (rawPriority === 'alta') priority = 'HIGH';
      else if (rawPriority === 'baixa') priority = 'LOW';

      try {
        let projectId: string | undefined;
        if (projectName) {
          const foundProject = await this.prisma.project.findFirst({
            where: { organizationId: orgId, name: { contains: projectName, mode: 'insensitive' } },
          });
          if (foundProject) projectId = foundProject.id;
        }

        // Pega status default
        const defaultStatus = await this.prisma.taskStatus.findFirst({
          where: { organizationId: orgId, isDefault: true },
        }) || await this.prisma.taskStatus.findFirst({
          where: { organizationId: orgId },
          orderBy: { position: 'asc' },
        });

        if (defaultStatus) {
          const createdTask = await this.prisma.$transaction(async (tx) => {
            const updatedOrg = await tx.organization.update({
              where: { id: orgId },
              data: { taskSequence: { increment: 1 } },
              select: { taskSequence: true },
            });

            const lastTask = await tx.task.findFirst({
              where: { organizationId: orgId, statusId: defaultStatus.id },
              orderBy: { position: 'desc' },
              select: { position: true },
            });
            const position = (lastTask?.position ?? 0) + 1000;

            return tx.task.create({
              data: {
                organizationId: orgId,
                number: updatedOrg.taskSequence,
                title: taskTitle,
                priority,
                statusId: defaultStatus.id,
                position,
                projectId,
                createdById: userId,
              },
            });
          });

          toolExecution = {
            tool: 'create_task',
            level: 2,
            status: 'succeeded',
            details: `Tarefa #${createdTask.number} criada com sucesso`,
          };
          references = [{ type: 'Task', id: createdTask.id, label: `#${createdTask.number} ${createdTask.title}` }];
          reply = `Pronto! Criei a tarefa **#${createdTask.number} - ${createdTask.title}** com prioridade **${priority}** no status **${defaultStatus.name}**.`;
        } else {
          reply = 'Não consegui criar a tarefa pois nenhum status de Kanban foi encontrado para a organização.';
        }
      } catch (err: any) {
        this.logger.error('Erro ao criar tarefa via Jarvis', err);
        reply = `Ocorreu um erro ao criar a tarefa: ${err.message}`;
        toolExecution = { tool: 'create_task', level: 2, status: 'failed', details: err.message };
      }
    }
    // TOOL: Prioridades e Vencimentos de Hoje
    else if (lower.includes('prioridade') || lower.includes('hoje') || lower.includes('vence hoje') || lower.includes('vencendo')) {
      toolExecution = { tool: 'list_due_today', level: 1, status: 'succeeded' };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      const dueTodayTasks = await this.prisma.task.findMany({
        where: {
          organizationId: orgId,
          archivedAt: null,
          dueDate: { gte: today, lte: endOfToday },
          status: { category: { notIn: ['DONE', 'CANCELLED'] } },
        },
        include: { status: true },
        take: 10,
        orderBy: { priority: 'desc' },
      });

      if (dueTodayTasks.length > 0) {
        reply = `Você tem **${dueTodayTasks.length} demanda(s)** programadas para entrega hoje:\n` +
          dueTodayTasks.map((t) => `• **#${t.number} ${t.title}** (Prioridade: ${t.priority} | Status: ${t.status.name})`).join('\n');
        references = dueTodayTasks.map((t) => ({ type: 'Task', id: t.id, label: `#${t.number} ${t.title}` }));
      } else {
        reply = 'Excelente notícia: você não tem nenhuma tarefa com vencimento para hoje! É um ótimo momento para focar em demandas de médio prazo ou planejar novos projetos.';
      }
    }
    // TOOL: Tarefas Atrasadas / Em Risco
    else if (lower.includes('atrasad') || lower.includes('em risco') || lower.includes('pendenci') || lower.includes('gargalo')) {
      toolExecution = { tool: 'get_overdue_tasks', level: 1, status: 'succeeded' };
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueTasks = await this.prisma.task.findMany({
        where: {
          organizationId: orgId,
          archivedAt: null,
          dueDate: { lt: today },
          status: { category: { notIn: ['DONE', 'CANCELLED'] } },
        },
        include: { status: true },
        take: 10,
        orderBy: { dueDate: 'asc' },
      });

      if (overdueTasks.length > 0) {
        reply = `Atenção: identifiquei **${overdueTasks.length} tarefa(s) atrasadas** que exigem atenção imediata:\n` +
          overdueTasks.map((t) => `• **#${t.number} ${t.title}** (Vencimento: ${t.dueDate ? t.dueDate.toLocaleDateString('pt-BR') : 'Sem data'} | Status: ${t.status.name})`).join('\n');
        references = overdueTasks.map((t) => ({ type: 'Task', id: t.id, label: `#${t.number} ${t.title}` }));
      } else {
        reply = 'Perfeito! Nenhuma tarefa está atrasada na sua organização. O fluxo operacional está 100% em dia.';
      }
    }
    // TOOL: Progresso dos Projetos
    else if (lower.includes('projeto') || lower.includes('progresso')) {
      toolExecution = { tool: 'get_projects_summary', level: 1, status: 'succeeded' };
      const projects = await this.prisma.project.findMany({
        where: { organizationId: orgId, archivedAt: null },
        include: {
          tasks: {
            where: { archivedAt: null },
            include: { status: true },
          },
        },
        take: 8,
      });

      if (projects.length > 0) {
        reply = `Aqui está o resumo dos projetos ativos:\n` +
          projects.map((p) => {
            const total = p.tasks.length;
            const completed = p.tasks.filter((t: any) => t.status.category === 'DONE').length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return `• **${p.name}**: ${pct}% concluído (${completed}/${total} tarefas)`;
          }).join('\n');
        references = projects.map((p) => ({ type: 'Project', id: p.id, label: p.name }));
      } else {
        reply = 'Nenhum projeto ativo cadastrado na organização. Você pode criar novos projetos no menu Projetos para organizar melhor as demandas.';
      }
    }
    // TOOL: Carga da Equipe / Membros
    else if (lower.includes('equipe') || lower.includes('membros') || lower.includes('sobrecarregad') || lower.includes('quem')) {
      toolExecution = { tool: 'get_team_workload', level: 1, status: 'succeeded' };
      const members = await this.prisma.membership.findMany({
        where: { organizationId: orgId, status: 'ACTIVE' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          role: { select: { name: true } },
        },
      });

      const memberIds = members.map((m) => m.user.id);
      const openTasksPerUser = await this.prisma.taskAssignee.groupBy({
        by: ['userId'],
        where: {
          userId: { in: memberIds },
          task: {
            organizationId: orgId,
            archivedAt: null,
            status: { category: { notIn: ['DONE', 'CANCELLED'] } },
          },
        },
        _count: { taskId: true },
      });

      const countMap = new Map<string, number>();
      for (const row of openTasksPerUser) {
        countMap.set(row.userId, row._count.taskId);
      }

      reply = `Aqui está a distribuição de demandas na equipe:\n` +
        members.map((m) => {
          const count = countMap.get(m.user.id) || 0;
          return `• **${m.user.name}** (${m.role.name}): ${count} tarefa(s) em aberto`;
        }).join('\n');
    }
    // LLM Fallback ou Inteligência Conversacional
    else {
      // Se houver GEMINI_API_KEY ou OPENAI_API_KEY no ambiente, aciona
      const geminiKey = process.env.GEMINI_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;

      if (geminiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey: geminiKey });
          const response = await ai.models.generateContent({
            model: process.env.AI_DEFAULT_MODEL || 'gemini-2.5-flash',
            contents: `Você é o Jarvis, assistente de inteligência e produtividade operacional do LoboFlow (plataforma SaaS de gestão empresarial). Responda em português brasileiro de forma direta, clara e prestativa.\nMensagem do usuário: ${text}`,
          });
          reply = response.text || 'Entendido. Como posso auxiliar em suas demandas operacionais?';
        } catch (err: any) {
          this.logger.warn('Falha na chamada ao Gemini API, usando fallback inteligente', err);
          reply = this.buildContextualFallback(text);
        }
      } else if (openaiKey) {
        try {
          const openai = new OpenAI({ apiKey: openaiKey });
          const comp = await openai.chat.completions.create({
            model: process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Você é o Jarvis, assistente de produtividade operacional do LoboFlow. Responda em português brasileiro de forma concisa e útil.',
              },
              { role: 'user', content: text },
            ],
          });
          reply = comp.choices[0]?.message?.content || 'Comando recebido. Como posso ajudar com seus projetos e tarefas hoje?';
        } catch (err: any) {
          this.logger.warn('Falha na chamada OpenAI, usando fallback inteligente', err);
          reply = this.buildContextualFallback(text);
        }
      } else {
        reply = this.buildContextualFallback(text);
      }
    }

    // 4. Salva a resposta do assistente no banco
    const assistantMsg = await this.prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: AiMessageRole.ASSISTANT,
        content: reply,
        toolCalls: toolExecution ? (toolExecution as any) : undefined,
        references: references.length > 0 ? (references as any) : undefined,
      },
    });

    // 5. Registra execução da ferramenta se houve
    if (toolExecution) {
      await this.prisma.aiToolExecution.create({
        data: {
          organizationId: orgId,
          conversationId: conversation.id,
          userId,
          toolCallId: assistantMsg.id,
          tool: toolExecution.tool,
          level: toolExecution.level,
          args: { message: text },
          status: toolExecution.status === 'succeeded' ? AiExecutionStatus.SUCCEEDED : AiExecutionStatus.FAILED,
          result: { reply, references } as any,
          finishedAt: new Date(),
        },
      });
    }

    return {
      conversationId: conversation.id,
      message: {
        id: assistantMsg.id,
        role: 'assistant',
        content: reply,
        toolExecution,
        references,
        createdAt: assistantMsg.createdAt.toISOString(),
      },
    };
  }

  async listConversations(orgId: string, userId: string) {
    return this.prisma.aiConversation.findMany({
      where: { organizationId: orgId, userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getMessages(orgId: string, userId: string, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: { id: conversationId, organizationId: orgId, userId },
    });
    if (!conversation) return [];

    return this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private buildContextualFallback(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('ajuda') || lower.includes('o que você faz') || lower.includes('comandos')) {
      return 'Sou o **Jarvis**, seu assistente de inteligência operacional no LoboFlow. Posso te ajudar a:\n\n' +
        '• **Consultar prioridades**: pergunte *"Quais são minhas prioridades hoje?"*\n' +
        '• **Detectar atrasos**: pergunte *"Quais tarefas estão atrasadas?"*\n' +
        '• **Criar tarefas**: diga *"Criar tarefa Revisar campanhas com prioridade alta"*\n' +
        '• **Acompanhar projetos**: pergunte *"Resuma o progresso dos projetos"*\n' +
        '• **Visualizar a equipe**: pergunte *"Como está a carga da equipe?"*';
    }

    return `Entendi perfeitamente: "${text}". No momento estou operando com acesso direto ao banco de dados do seu workspace. Para que eu execute ações, você pode me pedir para verificar prioridades, tarefas atrasadas, resumo de projetos ou até criar uma nova demanda diretamente!`;
  }
}
