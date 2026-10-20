import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadEnv } from './config/env';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const env = loadEnv();
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Headers de segurança com Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // O SPA React gerencia seu próprio CSP
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Parser de cookies para sessões seguras HttpOnly
  app.use(cookieParser(env.sessionSecret));

  // CORS restrito
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Permite requisições sem origin (ex.: mobile, testes locais ou curl)
      if (!origin) return callback(null, true);
      if (env.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origem CORS não permitida: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-organization-id',
      'x-request-id',
    ],
  });

  // Filtro de exceções padronizado
  app.useGlobalFilters(new AllExceptionsFilter());

  // Prefixo versionado da API
  app.setGlobalPrefix(env.API_PREFIX, {
    exclude: ['health', 'health/liveness'],
  });

  // Documentação Swagger/OpenAPI
  if (env.SWAGGER_ENABLED) {
    const config = new DocumentBuilder()
      .setTitle('LoboFlow API')
      .setDescription(
        'Documentação oficial da API REST do LoboFlow — Plataforma SaaS de gestão empresarial, produtividade e IA.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('loboflow_session')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log(`Swagger docs disponível em: http://localhost:${env.PORT}/api/docs`);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(env.PORT, '0.0.0.0');
  logger.log(`🚀 LoboFlow API rodando na porta ${env.PORT} [${env.NODE_ENV}]`);
}

bootstrap();
