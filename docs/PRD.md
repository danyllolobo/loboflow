# LoboFlow — Documento de Requisitos do Produto (PRD)

## 1. Visão Geral do Produto
O **LoboFlow** é uma plataforma SaaS unificada de gestão empresarial, produtividade, automação e inteligência artificial operacional. O produto nasce para atender a operação interna de alta intensidade da **LoboAds** (agência de marketing digital e performance) e é estruturado desde o dia zero com arquitetura multi-tenant, permitindo expansão comercial para agências, consultorias e empresas de serviços.

## 2. Objetivos Estratégicos
- **Operação Centralizada:** Unificar gestão de projetos, tarefas diárias, carteira de clientes, documentos e comercial sob uma única interface.
- **Isolamento e Segurança Multi-Tenant:** Cada organização possui dados estritamente isolados em nível de banco de dados, API, autenticação e filas assíncronas.
- **Automação Sem Código:** Gatilhos e ações (webhook, notificações, templates) configuráveis por organização sem intervenção técnica.
- **Assistente Operacional IA (Jarvis):** Integração com modelos LLM (Gemini e OpenAI) com tool-calling nativo, classificação de risco em 3 níveis (leitura, reversível, crítico) e estrita segurança contra prompt injection.
- **Flexibilidade Modular:** Módulos específicos (como Roteiros de Conteúdo e Comercial) podem ser ativados/desativados conforme o segmento da empresa.

## 3. Módulos e Funcionalidades

### 3.1 Gestão de Tarefas
- Visualização em Lista, Kanban e Filtros Especializados (Minhas tarefas, Atrasadas, Sem responsável, Próximas).
- Campos essenciais: Título, descrição rica, prioridade (Baixa, Média, Alta, Urgente), datas (início e prazo @db.Date), responsável(is), projeto, cliente, subtarefas e checklist interativo, etiquetas coloridas e anexos.
- Comentários e histórico de alterações detalhado (autor, data, valor anterior e novo).
- Sequencial amigável por empresa (ex.: LoboFlow #101).

### 3.2 Projetos e Clientes
- **Projetos:** Visão geral com cálculo dinâmico de progresso (%) baseado em tarefas concluídas, prazos, responsável e equipe associada.
- **Clientes:** Ficha cadastral completa com perfil de agência (público-alvo, tom de voz, restrições e diferenciais), histórico de tarefas, contratos e documentos vinculados.

### 3.3 Roteiros e Produção de Conteúdo (Agências)
- Biblioteca de roteiros por cliente, com formatos (Stories, Reels, Feed, Carrossel, YouTube).
- Mês de referência e fluxo de aprovação (Rascunho, Em revisão, Aprovado, Gravado, Publicado).
- Versionamento com registro de notas de alteração.

### 3.4 Funil Comercial e Gestão de Contratos
- Pipeline de negociações (Novo, Contato, Proposta, Negociação, Fechado, Perdido) com motivos estruturados de perda.
- Gestão de contratos ativos e encerramentos auditados (motivos estruturados, intenção de retorno e data prevista para reabordagem).

### 3.5 Jarvis — Assistente IA
- Chat persistente com identificação de contexto e suporte a streaming.
- Execução controlada de ferramentas:
  - *Nível 1 (Leitura):* Listar tarefas, projetos, clientes, atrasos e gargalos.
  - *Nível 2 (Reversível):* Criar tarefa, atualizar status, atribuir responsável.
  - *Nível 3 (Sensível):* Exclusões, envio externo, acionamento de webhooks com confirmação explícita.

### 3.6 SuperAdmin Global
- Área isolada para operadores da plataforma: visão geral de organizações cadastradas, suspensão/reativação, métricas globais, feature flags e auditoria de suporte temporário.
