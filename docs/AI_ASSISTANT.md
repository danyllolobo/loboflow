# LoboFlow — Arquitetura e Limites de Atuação do Jarvis (IA)

## 1. Visão Geral do Jarvis
O **Jarvis** é o assistente inteligente de inteligência operacional nativo do LoboFlow. Diferente de um chatbot genérico desconectado do negócio, o Jarvis opera com **Function Calling / Tool Calling** tipado e seguro sobre as APIs internas do LoboFlow.

## 2. Níveis de Risco e Política de Confirmação

| Nível | Classificação | Comportamento | Exemplos de Ferramentas |
|---|---|---|---|
| **Nível 1** | **Consulta / Leitura** | Execução automática e direta se o usuário tiver permissão. | `list_my_tasks`, `get_project_summary`, `get_overdue_tasks`, `search_tasks` |
| **Nível 2** | **Ação Reversível** | Execução com resumo ou confirmação conforme política da organização. | `create_task`, `update_task_status`, `assign_task`, `create_project` |
| **Nível 3** | **Ação Sensível / Crítica** | **Exige confirmação explícita na UI** antes de qualquer mutação. | `archive_task`, `delete_document`, `trigger_webhook`, `broadcast_email` |

## 3. Arquitetura Multi-Provedor (Adapter Pattern)
- O sistema abstrai os provedores através de interfaces comuns em `AiProviderService`.
- Suporte nativo inicial:
  - **Google Gemini API** (via `@google/genai` com modelos como `gemini-2.5-flash`).
  - **OpenAI API** (via `openai` com modelos como `gpt-4o-mini`).
- A organização pode utilizar a chave global configurada pelo SuperAdmin ou cadastrar sua própria chave de API com limites dedicados de tokens.

## 4. Proteção contra Prompt Injection e Fuga de Dados
1. **Minimização de Contexto:** O Jarvis nunca recebe despejos completos do banco de dados. Apenas entidades explicitamente requisitadas pelas ferramentas autorizadas entram no contexto de mensagens.
2. **Separação Estrita de Papéis:** Conteúdos provenientes de tarefas, descrições ou anexos são encapsulados como dados não confiáveis de terceiros, com instruções de sistema estritas proibindo a alteração de diretrizes primárias de segurança.
3. **Validação de Autorização Server-Side:** Toda ferramenta invocada pelo modelo chama os mesmos serviços do backend com o `userId` e `organizationId` do usuário da sessão. Se o usuário não tiver permissão para ver um cliente ou editar uma tarefa, a ferramenta falha e o Jarvis informa a restrição de acesso.
