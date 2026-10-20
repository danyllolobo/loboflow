/** Enums de domínio compartilhados (espelham os enums do Prisma). */

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const STATUS_CATEGORIES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'] as const;
export type StatusCategory = (typeof STATUS_CATEGORIES)[number];

/** Fluxo inicial criado em toda organização (configurável depois). */
export const DEFAULT_TASK_STATUSES: { name: string; category: StatusCategory; color: string }[] = [
  { name: 'A fazer', category: 'TODO', color: '#64748b' },
  { name: 'Em andamento', category: 'IN_PROGRESS', color: '#0ea5e9' },
  { name: 'Em revisão', category: 'REVIEW', color: '#a855f7' },
  { name: 'Em alteração', category: 'IN_PROGRESS', color: '#f59e0b' },
  { name: 'Concluída', category: 'DONE', color: '#10b981' },
  { name: 'Cancelada', category: 'CANCELLED', color: '#ef4444' },
];

export const PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: 'Planejado',
  ACTIVE: 'Ativo',
  ON_HOLD: 'Pausado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

export const CLIENT_STATUSES = ['LEAD', 'ACTIVE', 'PAUSED', 'CHURNED'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  LEAD: 'Prospect',
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  CHURNED: 'Encerrado',
};

export const DOCUMENT_CATEGORIES = [
  'CONTRACT',
  'PROPOSAL',
  'BRIEFING',
  'AUTHORIZATION',
  'RECEIPT',
  'DELIVERABLE',
  'OTHER',
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  CONTRACT: 'Contrato',
  PROPOSAL: 'Proposta',
  BRIEFING: 'Briefing',
  AUTHORIZATION: 'Autorização',
  RECEIPT: 'Comprovante',
  DELIVERABLE: 'Material entregue',
  OTHER: 'Outro',
};

export const SCRIPT_STATUSES = ['DRAFT', 'REVIEW', 'APPROVED', 'RECORDED', 'PUBLISHED'] as const;
export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];
export const SCRIPT_STATUS_LABELS: Record<ScriptStatus, string> = {
  DRAFT: 'Rascunho',
  REVIEW: 'Em revisão',
  APPROVED: 'Aprovado',
  RECORDED: 'Gravado',
  PUBLISHED: 'Publicado',
};
export const DEFAULT_SCRIPT_FORMATS = ['Stories', 'Reels', 'Feed', 'Carrossel', 'YouTube'];

export const DEAL_STAGES = ['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contato feito',
  PROPOSAL: 'Proposta enviada',
  NEGOTIATION: 'Em negociação',
  WON: 'Fechado',
  LOST: 'Perdido',
};
export const DEAL_LOST_REASONS = {
  PRICE: 'Preço',
  TIMING: 'Momento inadequado',
  COMPETITOR: 'Escolheu concorrente',
  NO_RESPONSE: 'Sem retorno',
  SCOPE: 'Escopo não atende',
  BUDGET: 'Sem orçamento',
  OTHER: 'Outro',
} as const;
export const DEAL_INTERACTION_TYPES = ['CALL', 'EMAIL', 'MEETING', 'MESSAGE', 'NOTE'] as const;

export const CONTRACT_STATUSES = ['ACTIVE', 'ENDED'] as const;
export const RENEWAL_STATUSES = ['PENDING', 'RENEWED', 'NOT_RENEWING', 'NOT_APPLICABLE'] as const;
export const CONTRACT_END_REASONS = {
  PRICE: 'Preço',
  RESULTS: 'Resultados abaixo do esperado',
  INTERNAL: 'Mudança interna do cliente',
  BUDGET_CUT: 'Corte de orçamento',
  INSOURCING: 'Internalizou o serviço',
  COMPETITOR: 'Migrou para concorrente',
  AGENCY_DECISION: 'Decisão da agência',
  OTHER: 'Outro',
} as const;
export const RETURN_INTENTIONS = ['YES', 'MAYBE', 'NO'] as const;

export const ORGANIZATION_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

/** Eventos de domínio — usados por notificações, automações e webhooks. */
export const DOMAIN_EVENTS = [
  'task.created',
  'task.updated',
  'task.status_changed',
  'task.assigned',
  'task.completed',
  'task.archived',
  'task.commented',
  'task.due_soon',
  'task.overdue',
  'project.created',
  'project.updated',
  'client.created',
  'client.updated',
  'deal.created',
  'deal.stage_changed',
  'deal.won',
  'deal.lost',
  'deal.reapproach_due',
  'contract.created',
  'contract.ended',
  'contract.expiring',
  'document.uploaded',
  'script.status_changed',
  'member.invited',
  'member.joined',
  'automation.failed',
] as const;
export type DomainEventType = (typeof DOMAIN_EVENTS)[number];

export const NOTIFICATION_TYPES = [
  'task.assigned',
  'task.due_soon',
  'task.overdue',
  'task.commented',
  'task.mentioned',
  'project.updated',
  'member.invited',
  'contract.expiring',
  'deal.reapproach_due',
  'automation.failed',
  'approval.requested',
  'automation.notify',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  'task.assigned': 'Tarefa atribuída a mim',
  'task.due_soon': 'Prazo próximo',
  'task.overdue': 'Tarefa atrasada',
  'task.commented': 'Comentário em tarefa que acompanho',
  'task.mentioned': 'Menção em comentário',
  'project.updated': 'Projeto atualizado',
  'member.invited': 'Convites',
  'contract.expiring': 'Contrato próximo do vencimento',
  'deal.reapproach_due': 'Reabordagem comercial',
  'automation.failed': 'Falha em automação',
  'approval.requested': 'Aprovação pendente',
  'automation.notify': 'Avisos de automações',
};

/** Níveis de risco das ferramentas do Jarvis. */
export const AI_TOOL_LEVELS = {
  READ: 1,
  REVERSIBLE: 2,
  SENSITIVE: 3,
} as const;
export type AiToolLevel = (typeof AI_TOOL_LEVELS)[keyof typeof AI_TOOL_LEVELS];

export const AI_PROVIDERS = ['GEMINI', 'OPENAI'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];
