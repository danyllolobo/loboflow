import { z } from 'zod';

/**
 * Validação de variáveis de ambiente no startup.
 * Em produção, segredos ausentes/fracos impedem a inicialização (sem fallback silencioso).
 */
const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_NAME: z.string().default('LoboFlow'),
    APP_URL: z.url().default('http://localhost:5173'),
    PORT: z.coerce.number().int().default(3000),
    API_PREFIX: z.string().default('/api/v1'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    TRUST_PROXY: bool.default(false),
    SWAGGER_ENABLED: bool.optional(),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    REDIS_URL: z.string().optional(),

    SESSION_SECRET: z.string().optional(),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),
    ENCRYPTION_KEY: z.string().optional(),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    ALLOW_PUBLIC_SIGNUP: bool.default(true),
    REQUIRE_EMAIL_VERIFICATION: bool.default(false),

    STORAGE_PROVIDER: z.enum(['s3', 'minio', 'none']).default('none'),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: bool.default(true),
    S3_AUTO_CREATE_BUCKET: bool.default(false),
    UPLOAD_MAX_MB: z.coerce.number().int().min(1).max(500).default(25),

    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().optional(),
    SMTP_SECURE: bool.default(false),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    SMTP_FROM_NAME: z.string().default('LoboFlow'),

    AI_DEFAULT_PROVIDER: z.enum(['GEMINI', 'OPENAI']).optional(),
    AI_DEFAULT_MODEL: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),

    WEBHOOK_ALLOW_PRIVATE_TARGETS: bool.default(false),
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(50).default(5),
  })
  .superRefine((env, ctx) => {
    const prod = env.NODE_ENV === 'production';
    const need = (key: keyof typeof env, minLen: number, hint: string) => {
      const value = env[key];
      if (typeof value !== 'string' || value.length < minLen) {
        ctx.addIssue({ code: 'custom', path: [key], message: hint });
      }
    };
    if (prod) {
      need('SESSION_SECRET', 32, 'SESSION_SECRET é obrigatória em produção (mín. 32 caracteres)');
      need('ENCRYPTION_KEY', 44, 'ENCRYPTION_KEY é obrigatória em produção (32 bytes em base64)');
      if (env.WEBHOOK_ALLOW_PRIVATE_TARGETS) {
        ctx.addIssue({
          code: 'custom',
          path: ['WEBHOOK_ALLOW_PRIVATE_TARGETS'],
          message: 'Não é permitido liberar destinos privados para webhooks em produção',
        });
      }
    }
    if (env.STORAGE_PROVIDER !== 'none') {
      for (const k of ['S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'] as const) {
        if (!env[k]) ctx.addIssue({ code: 'custom', path: [k], message: `${k} é obrigatória quando STORAGE_PROVIDER=${env.STORAGE_PROVIDER}` });
      }
    }
  });

export type AppEnv = z.infer<typeof schema> & {
  corsOrigins: string[];
  isProd: boolean;
  isTest: boolean;
  encryptionKey: Buffer;
  sessionSecret: string;
};

let cached: AppEnv | null = null;

/** Chave apenas para desenvolvimento/testes — produção exige ENCRYPTION_KEY real. */
const DEV_ENCRYPTION_KEY = Buffer.alloc(32, 7);

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  if (source === process.env && !source.DATABASE_URL) {
    try {
      if (typeof (process as any).loadEnvFile === 'function') {
        (process as any).loadEnvFile();
      }
    } catch {
      // Ignora se o arquivo .env não existir (variáveis injetadas pelo container)
    }
  }
  if (cached && source === process.env) return cached;
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Configuração inválida:\n${lines.join('\n')}\nConsulte .env.example`);
  }
  const env = parsed.data;
  const isProd = env.NODE_ENV === 'production';
  let encryptionKey = DEV_ENCRYPTION_KEY;
  if (env.ENCRYPTION_KEY) {
    encryptionKey = Buffer.from(env.ENCRYPTION_KEY, 'base64');
    if (encryptionKey.length !== 32) {
      throw new Error('ENCRYPTION_KEY deve ter exatamente 32 bytes codificados em base64 (gere com: openssl rand -base64 32)');
    }
  }
  const result: AppEnv = {
    ...env,
    corsOrigins: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    isProd,
    isTest: env.NODE_ENV === 'test',
    encryptionKey,
    sessionSecret: env.SESSION_SECRET ?? 'dev-only-session-secret-not-for-production',
    SWAGGER_ENABLED: env.SWAGGER_ENABLED ?? !isProd,
  };
  if (source === process.env) cached = result;
  return result;
}

export function resetEnvCache() {
  cached = null;
}

export const APP_ENV = Symbol('APP_ENV');
