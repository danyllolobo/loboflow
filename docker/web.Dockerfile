# ==============================================================================
# LoboFlow Web (SPA React) — Dockerfile de Produção para EasyPanel
# ==============================================================================

FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10

# Copia manifestos de dependências para otimizar cache do Docker
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

# Copia código-fonte necessário para o build
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Compila pacotes compartilhados
RUN pnpm --filter @loboflow/shared build
RUN pnpm --filter @loboflow/validation build

# Compila o frontend SPA
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm --filter @loboflow/web build

# Estágio de Execução com Nginx ultraleve
FROM nginx:alpine AS runner

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
