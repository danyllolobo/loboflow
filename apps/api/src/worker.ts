import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { loadEnv } from './config/env';

async function bootstrap() {
  const env = loadEnv();
  const logger = new Logger('Worker');

  logger.log(`⚙️ Inicializando LoboFlow Background Worker [${env.NODE_ENV}]...`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  app.enableShutdownHooks();

  const prisma = app.get(PrismaService);
  let isRunning = true;

  // Rotina 1: Limpeza de sessões expiradas
  const cleanExpiredSessions = async () => {
    try {
      const deleted = await prisma.session.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });
      if (deleted.count > 0) {
        logger.log(`🧹 Limpeza: ${deleted.count} sessões expiradas removidas.`);
      }
    } catch (err: any) {
      logger.error(`Erro ao limpar sessões expiradas: ${err?.message}`);
    }
  };

  // Rotina 2: Verificação de tarefas vencidas e alertas operacionais
  const processOverdueTasks = async () => {
    try {
      const overdueTasks = await prisma.task.findMany({
        where: {
          dueDate: {
            lt: new Date(),
          },
          status: {
            category: {
              not: 'DONE',
            },
          },
        },
        select: {
          id: true,
          title: true,
          organizationId: true,
          dueDate: true,
        },
        take: 20,
      });

      if (overdueTasks.length > 0) {
        logger.log(`⚠️ Tarefas em atraso detectadas: ${overdueTasks.length}`);
      }
    } catch (err: any) {
      logger.error(`Erro ao verificar tarefas em atraso: ${err?.message}`);
    }
  };

  // Loop de processamento em segundo plano (a cada 30 segundos)
  const workerInterval = setInterval(async () => {
    if (!isRunning) return;
    await cleanExpiredSessions();
    await processOverdueTasks();
  }, 30_000);

  // Executa imediatamente na subida
  await cleanExpiredSessions();
  await processOverdueTasks();

  logger.log('✅ LoboFlow Background Worker ativo e monitorando jobs assíncronos.');

  // Tratamento de término gracioso
  const shutdown = async (signal: string) => {
    logger.log(`Recebido sinal ${signal}. Encerrando Worker com segurança...`);
    isRunning = false;
    clearInterval(workerInterval);
    await app.close();
    logger.log('Worker finalizado.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Falha fatal ao inicializar o Worker:', err);
  process.exit(1);
});
