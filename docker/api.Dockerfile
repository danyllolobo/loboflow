# ==============================================================================
# LoboFlow API (NestJS) — Dockerfile de Produção para EasyPanel
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

# Dependências nativas necessárias para o Prisma no Alpine
RUN apk add --no-cache libc6-compat openssl

RUN npm install -g pnpm@10

# Copia manifestos de dependências do monorepo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copia código-fonte
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Compila shared, validation e api (incluindo prisma generate)
RUN pnpm --filter @loboflow/shared build
RUN pnpm --filter @loboflow/validation build
RUN pnpm --filter @loboflow/api build

# Estágio de Execução
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV PORT=3000

# Copia node_modules do workspace e dist compilado
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/package.json ./package.json

USER node

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
