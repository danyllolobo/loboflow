# LoboFlow — Enterprise Multi-Tenant SaaS Platform

<div align="center">
  <img src="apps/web/public/loboflow-logo-dark.png" alt="LoboFlow" width="280" />
  <p><strong>Plataforma SaaS de Gestão Empresarial, Produtividade, Automação e IA Operacional</strong></p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-green.svg)](https://nodejs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
  [![NestJS](https://img.shields.io/badge/NestJS-11.1-red.svg)](https://nestjs.com/)
  [![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-7-purple.svg)](https://vitejs.dev/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8.svg)](https://tailwindcss.com/)
  [![Prisma](https://img.shields.io/badge/Prisma-6.19-2d3748.svg)](https://www.prisma.io/)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17%2F18-336791.svg)](https://www.postgresql.org/)
</div>

---

## 🚀 Visão Geral

O **LoboFlow** é uma plataforma SaaS profissional de alta performance projetada para centralizar a operação, produtividade, gestão de clientes e automação de agências e empresas de serviços. Construído com arquitetura **Multi-Tenant estrita**, garantindo isolamento físico de dados no nível do banco de dados relacional (PostgreSQL) por meio de chaves estrangeiras compostas `[organizationId, id]`.

### 🌟 Principais Recursos

- **Gestão de Tarefas & Kanban Interativo**: Fluxo visual em colunas com arrastar-e-soltar (drag-and-drop), filtros operacionais (Minhas tarefas, Atrasadas, Vencem hoje, Próximas), prioridades, checklists dinâmicos, comentários e histórico de auditoria.
- **Projetos com Cálculo Automático**: Acompanhamento de entregas, membros da equipe, clientes vinculados e taxa de progresso em tempo real baseada no cumprimento de tarefas.
- **CRM & Gestão de Clientes**: Ficha completa com público-alvo, diretrizes de tom de voz, restrições da marca, contratos e histórico de demandas.
- **Biblioteca de Roteiros & Conteúdo**: Fluxo editorial de aprovação para formatos de redes sociais (Reels, Carrossel, Stories, YouTube, Feed) com versionamento.
- **Funil Comercial & Pipeline de Vendas**: Gestão visual de negociações, motivos estruturados de perda e contratos ativos com previsão de reabordagem.
- **Jarvis — Assistente de IA Operacional**: Agente com execução de ferramentas (*tool-calling*) classificadas em 3 níveis de risco (leitura, reversível e crítico), pronto para integração com Google Gemini e OpenAI.
- **Segurança de Nível Empresarial**: Autenticação com Argon2id, sessões em cookies HttpOnly seguros, proteção CSRF/CORS, RBAC com escopos granulares (`ALL`, `ASSIGNED`, `OWN`) e criptografia de credenciais AES-256-GCM.
- **Painel SuperAdmin**: Gestão centralizada de instâncias, métricas globais, auditoria de acessos de suporte e suspensão/reativação com confirmação explícita.

---

## 🏗️ Arquitetura do Monorepo

```
loboflow/
├── apps/
│   ├── api/                 # Backend REST NestJS 11 + Prisma ORM + Worker
│   │   ├── prisma/          # Schema relacional e migrações versionadas
│   │   ├── src/             # Módulos: auth, tasks, projects, clients, dashboard, etc.
│   │   └── test/            # Testes de isolamento multi-tenant e segurança
│   └── web/                 # Frontend SPA React 19 + Vite 7 + Tailwind CSS v4
│       ├── public/          # Assets oficiais da marca (dark e light)
│       └── src/             # Componentes, contextos, páginas e design system
├── packages/
│   ├── config/              # tsconfig base e padrões do monorepo
│   ├── shared/              # Contratos de API, tipos, permissões RBAC e constantes
│   └── validation/          # Schemas Zod de validação compartilhados
├── docker/                  # Dockerfiles multi-stage para api, worker e web (Nginx)
├── docs/                    # PRD, Arquitetura, Segurança, Deploy no EasyPanel
└── compose.yaml             # Orquestração para implantação em produção
```

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| **Linguagem** | TypeScript 5.9 (Strict Mode em todos os pacotes) |
| **Monorepo** | pnpm Workspaces |
| **Backend** | NestJS 11, Express, Class-Validator, Helmet, Cookie-Parser |
| **ORM & Banco** | Prisma 6.19.3, PostgreSQL 17/18 nativo |
| **Frontend** | React 19, Vite 7, Tailwind CSS v4, Lucide Icons |
| **Roteamento & Estado** | React Router 7, TanStack Query 5 |
| **Segurança** | Argon2id (@node-rs/argon2), AES-256-GCM, HttpOnly Lax Cookies |
| **Deploy** | Docker Multi-stage, EasyPanel, Nginx Alpine |

---

## ⚡ Inicialização Rápida para Desenvolvimento Local

### Pré-requisitos
- Node.js 22 LTS
- pnpm (`npm install -g pnpm@10`)
- PostgreSQL rodando localmente (porta 5432)

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/danyllolobo/loboflow.git
cd loboflow
pnpm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo de exemplo e configure sua string de conexão:
```bash
cp .env.example .env
cp .env.example apps/api/.env
```

### 3. Executar Migrações e Seed do Banco
```bash
pnpm --filter @loboflow/api prisma migrate dev
pnpm --filter @loboflow/api db:seed
```

### 4. Iniciar os Servidores em Modo de Desenvolvimento
```bash
# Inicia API (porta 3000) e Web SPA (porta 5173) simultaneamente:
pnpm dev
```

Abra seu navegador em [http://localhost:5173](http://localhost:5173).

---

## 🧪 Testes e Qualidade de Código

```bash
# Executa a suíte de testes automatizados em todo o monorepo
pnpm test

# Valida tipagem TypeScript em todos os 5 pacotes (zero erros)
pnpm typecheck

# Compila os pacotes compartilhados e a aplicação Web para produção
pnpm build
```

---

## 🚢 Implantação em Produção (EasyPanel / Docker)

Consulte o guia completo em [docs/DEPLOY_EASYPANEL.md](docs/DEPLOY_EASYPANEL.md).

O projeto disponibiliza contêineres Docker multi-stage otimizados:
* `docker/api.Dockerfile`: Backend NestJS com Prisma client gerado sobre Alpine Linux.
* `docker/worker.Dockerfile`: Processamento de jobs assíncronos e limpeza de sessões.
* `docker/web.Dockerfile`: SPA React compilado e servido por Nginx Alpine ultraleve com gzip e headers de segurança.
* `compose.yaml`: Configuração pronta para subir todos os serviços com healthchecks automatizados.

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para obter mais detalhes.

---

<div align="center">
  Desenvolvido com excelência para <strong>LoboAds</strong> e o ecossistema SaaS.
</div>
