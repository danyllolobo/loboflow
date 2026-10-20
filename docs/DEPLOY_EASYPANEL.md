# LoboFlow — Guia de Implantação e Manutenção no EasyPanel

## 1. Visão Geral da Topologia no EasyPanel

No EasyPanel, a arquitetura do LoboFlow é implantada de forma limpa e econômica:

```
                  ┌──────────────────────┐
                  │    EasyPanel Traefik │ (SSL / Domínio Público)
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │  Serviço: web   │ (Porta 80)    │  Serviço: api   │ (Porta 3000)
   │  Nginx + SPA    │               │  NestJS REST    │
   └─────────────────┘               └────────┬────────┘
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      ▼                       ▼                       ▼
             ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
             │ Serviço: worker │     │ PostgreSQL Nativo│    │  Redis Nativo   │
             │ NestJS Worker   │     │ (Serviço Persist)│    │  (Opcional)     │
             └─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 2. Passo a Passo de Implantação

### Passo 1: Criar o Projeto no EasyPanel
1. No painel do EasyPanel, clique em **+ Project** e crie um projeto com o nome `loboflow`.

### Passo 2: Criar o Serviço de Banco de Dados PostgreSQL
1. No projeto `loboflow`, clique em **+ Service** -> **Database** -> **PostgreSQL**.
2. Defina nome `postgres`, usuário `loboflow` e anote a senha gerada.
3. O EasyPanel fornecerá uma string de conexão interna, por exemplo:
   `postgresql://loboflow:SENHA@postgres:5432/loboflow?schema=public`

### Passo 3: Criar o Serviço de Cache/Filas (Redis)
1. Clique em **+ Service** -> **Database** -> **Redis**.
2. Nome: `redis`. String interna: `redis://redis:6379`.

### Passo 4: Criar o Serviço Backend (`api`)
1. Clique em **+ Service** -> **App**.
2. Nome: `api`.
3. Source: Conecte o repositório GitHub `danyllolobo/loboflow`, branch `main`.
4. Build Type: **Docker**.
5. Dockerfile Path: `docker/api.Dockerfile`.
6. Variáveis de Ambiente Essenciais:
   - `NODE_ENV=production`
   - `DATABASE_URL=postgresql://...` (URL interna do PostgreSQL)
   - `REDIS_URL=redis://redis:6379`
   - `SESSION_SECRET=...` (mínimo 32 caracteres gerados com `openssl rand -hex 24`)
   - `ENCRYPTION_KEY=...` (32 bytes em Base64 gerados com `openssl rand -base64 32`)
   - `APP_URL=https://app.loboflow.com.br`
   - `CORS_ORIGINS=https://app.loboflow.com.br`
   - `STORAGE_PROVIDER=none` (ou credenciais S3/MinIO)
7. Domínio: Atribua o subdomínio da API (ex.: `api.loboflow.com.br`) com SSL automático.

### Passo 5: Criar o Serviço Worker Assíncrono (`worker`)
1. Clique em **+ Service** -> **App**.
2. Nome: `worker`.
3. Mesmo repositório GitHub, Dockerfile: `docker/worker.Dockerfile`.
4. Mesmas variáveis de ambiente do serviço `api`.
5. Este serviço não precisa de domínio público associado.

### Passo 6: Criar o Serviço Frontend (`web`)
1. Clique em **+ Service** -> **App**.
2. Nome: `web`.
3. Mesma fonte GitHub, Dockerfile: `docker/web.Dockerfile`.
4. Build Args:
   - `VITE_API_URL=https://api.loboflow.com.br`
5. Domínio: Atribua o domínio principal (ex.: `app.loboflow.com.br`).

### Passo 7: Migração e Criação do Primeiro SuperAdmin
No terminal web do serviço `api` do EasyPanel, execute:
```bash
# Executa as migrações versionadas
pnpm db:deploy

# Inicializa o SuperAdmin inicial com segurança interativa ou variáveis
pnpm superadmin:create --email="danyllolobo@live.com" --name="Danyllo Lobo"
```
