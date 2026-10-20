# LoboFlow — Decisões de Arquitetura Técnica

## 1. Visão Geral da Arquitetura

O LoboFlow é concebido como um monorepo modular orquestrado pelo **pnpm workspaces**:

```
loboflow/
├── apps/
│   ├── api/                  # Backend NestJS (REST API + Worker de Filas)
│   └── web/                  # Frontend SPA (React 19 + Vite 7 + Tailwind CSS v4)
├── packages/
│   ├── shared/               # Tipos de domínio, catálogo de permissões RBAC e contratos
│   ├── validation/           # Schemas Zod compartilhados entre API e Frontend
│   └── config/               # Configurações TypeScript e ferramentas
├── docs/                     # Documentação viva do projeto
├── docker/                   # Dockerfiles de produção multi-stage
└── compose.dev.yaml          # Infraestrutura de desenvolvimento local
```

## 2. Decisões Arquiteturais Fundamentais (ADRs)

### ADR-01: Monorepo com Contratos Fortemente Tipados
- **Contexto:** Manter integridade entre cliente e servidor sem duplicação de regras.
- **Decisão:** `@loboflow/shared` e `@loboflow/validation` são consumidos diretamente tanto pela API NestJS quanto pelo frontend React via aliases do Vite/TypeScript.
- **Benefício:** Qualquer alteração em schema ou permissão reflete instantaneamente em tempo de compilação em ambos os lados.

### ADR-02: Isolamento Multi-Tenant com Chaves Estrangeiras Compostas
- **Contexto:** Garantir que nunca haja vazamento de dados ou referências cruzadas entre empresas (ex.: associar tarefa de uma empresa ao cliente de outra).
- **Decisão:** No PostgreSQL, as tabelas de negócio utilizam chave estrangeira composta `@@unique([organizationId, id])` e as relações referenciam `[organizationId, foreignKey]`.
- **Benefício:** O próprio PostgreSQL impede fisicamente referências cruzadas via constraints relacionais, mesmo se houvesse falha lógica na aplicação.

### ADR-03: Processo Unificado para API e Worker (Zero Complexidade Desnecessária)
- **Contexto:** Executar tarefas assíncronas (notificações, webhooks, despachos) sem a necessidade de manter dois repositórios ou compilações separadas.
- **Decisão:** O `@loboflow/api` compila para `dist/main.js` (servidor HTTP REST) e `dist/worker.js` (processador BullMQ / Outbox dispatcher). Ambos compartilham o mesmo código de serviço e modelo de dados.

### ADR-04: Transações com Outbox Pattern
- **Contexto:** Garantir que falhas momentâneas de rede ou ausência de Redis em dev não causem perda de eventos de negócio (como notificações e automações).
- **Decisão:** Toda mutação relevante grava a alteração no banco e um registro na tabela `OutboxEvent` na mesma transação atômica do Prisma. O worker drena os eventos com garantia de entrega *at-least-once* e chaves de deduplicação.

### ADR-05: Autenticação Segura Baseada em Sessões e Cookies HttpOnly
- **Contexto:** Evitar vulnerabilidades de armazenamento de tokens sensíveis (como JWTs em LocalStorage sujeitos a XSS).
- **Decisão:** Sessões opacas registradas no banco de dados e enviadas ao cliente via Cookie seguro `HttpOnly`, `SameSite=Lax`, com expiração controlada e revogação imediata.
