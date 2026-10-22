import { z } from 'zod';
import {
  ALL_PERMISSIONS,
  AI_PROVIDERS,
  CLIENT_STATUSES,
  CONTRACT_END_REASONS,
  DEAL_INTERACTION_TYPES,
  DEAL_LOST_REASONS,
  DEAL_STAGES,
  DOCUMENT_CATEGORIES,
  DOMAIN_EVENTS,
  NOTIFICATION_TYPES,
  PERMISSION_SCOPES,
  PROJECT_STATUSES,
  RENEWAL_STATUSES,
  RETURN_INTENTIONS,
  SCRIPT_STATUSES,
  STATUS_CATEGORIES,
  TASK_PRIORITIES,
} from '@loboflow/shared';

/* ------------------------------------------------------------------ */
/* Primitivos                                                          */
/* ------------------------------------------------------------------ */

export const id = z.uuid({ message: 'Identificador inválido' });
const trimmed = (min: number, max: number, label = 'Campo') =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${label} é obrigatório` : `${label} deve ter ao menos ${min} caracteres`)
    .max(max, `${label} deve ter no máximo ${max} caracteres`);
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
export const email = z.string().trim().toLowerCase().pipe(z.email({ message: 'E-mail inválido' }));
/** Data sem horário: AAAA-MM-DD. Aceita também ISO datetime ou string vazia (convertida para null). */
export const dateOnly = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === '' || val === null) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (trimmed.includes('T')) {
      return trimmed.split('T')[0];
    }
    return trimmed;
  }
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  return val;
}, z.iso.date({ message: 'Data inválida (use AAAA-MM-DD)' }));
export const dateTime = z.iso.datetime({ offset: true, message: 'Data/hora inválida' });
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida');
export const password = z
  .string()
  .min(10, 'A senha deve ter ao menos 10 caracteres')
  .max(128, 'A senha deve ter no máximo 128 caracteres')
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'A senha deve conter letras e números');
const cents = z.number().int().min(0).max(1_000_000_000_00);
const url = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => /^https?:\/\//i.test(v), 'URL deve começar com http:// ou https://');

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

/* ------------------------------------------------------------------ */
/* Autenticação e conta                                                */
/* ------------------------------------------------------------------ */

export const registerSchema = z.object({
  name: trimmed(2, 120, 'Nome'),
  email,
  password,
  organizationName: trimmed(2, 120, 'Nome da empresa'),
});
export const loginSchema = z.object({ email, password: z.string().min(1, 'Informe a senha').max(128) });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ token: z.string().min(20).max(200), password });
export const verifyEmailSchema = z.object({ token: z.string().min(20).max(200) });
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});
export const acceptInvitationSchema = z.object({
  token: z.string().min(20).max(200),
  name: trimmed(2, 120, 'Nome').optional(),
  password: password.optional(),
});
export const updateProfileSchema = z.object({
  name: trimmed(2, 120, 'Nome').optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  timezone: z.string().max(64).optional().nullable(),
});

/* ------------------------------------------------------------------ */
/* Organização, membros e papéis                                       */
/* ------------------------------------------------------------------ */

export const createOrganizationSchema = z.object({
  name: trimmed(2, 120, 'Nome'),
  timezone: z.string().max(64).optional(),
});
export const updateOrganizationSchema = z.object({
  name: trimmed(2, 120, 'Nome').optional(),
  timezone: z.string().max(64).optional(),
  enabledModules: z.array(z.string().max(40)).max(30).optional(),
  onboardingCompleted: z.boolean().optional(),
});
export const inviteMemberSchema = z.object({ email, roleId: id });
export const updateMemberSchema = z.object({
  roleId: id.optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  title: optionalText(80),
});
export const rolePermissionInput = z.object({
  key: z.enum(ALL_PERMISSIONS as [string, ...string[]]),
  scope: z.enum(PERMISSION_SCOPES).default('ALL'),
});
export const roleSchema = z.object({
  name: trimmed(2, 60, 'Nome'),
  description: optionalText(240),
  permissions: z.array(rolePermissionInput).max(200),
});

/* ------------------------------------------------------------------ */
/* Tarefas                                                             */
/* ------------------------------------------------------------------ */

export const recurrenceSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  interval: z.number().int().min(1).max(12).default(1),
  until: dateOnly.optional().nullable(),
});

export const createTaskSchema = z.object({
  title: trimmed(1, 300, 'Título'),
  description: optionalText(20000),
  statusId: id.optional(),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  projectId: id.optional().nullable(),
  clientId: id.optional().nullable(),
  parentId: id.optional().nullable(),
  assigneeIds: z.array(id).max(20).default([]),
  labelIds: z.array(id).max(20).default([]),
  startDate: dateOnly.optional().nullable(),
  dueDate: dateOnly.optional().nullable(),
  type: optionalText(60),
  recurrence: recurrenceSchema.optional().nullable(),
});
export const updateTaskSchema = createTaskSchema
  .omit({ parentId: true, priority: true, assigneeIds: true, labelIds: true })
  .partial()
  .extend({
    priority: z.enum(TASK_PRIORITIES).optional(),
    assigneeIds: z.array(id).max(20).optional(),
    labelIds: z.array(id).max(20).optional(),
  });
export const moveTaskSchema = z.object({
  statusId: id,
  position: z.number().finite().optional(),
});
export const taskListQuery = paginationQuery.extend({
  view: z.enum(['all', 'mine', 'overdue', 'unassigned', 'upcoming', 'completed']).default('all'),
  q: z.string().trim().max(200).optional(),
  statusId: id.optional(),
  statusCategory: z.enum(STATUS_CATEGORIES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: id.optional(),
  projectId: id.optional(),
  clientId: id.optional(),
  labelId: id.optional(),
  dueFrom: dateOnly.optional(),
  dueTo: dateOnly.optional(),
  includeArchived: z.coerce.boolean().default(false),
  includeSubtasks: z.coerce.boolean().default(false),
  sort: z.enum(['dueDate', 'priority', 'createdAt', 'updatedAt', 'title', 'position']).default('position'),
  order: z.enum(['asc', 'desc']).default('asc'),
});
export const commentSchema = z.object({ body: trimmed(1, 10000, 'Comentário') });
export const checklistItemSchema = z.object({ title: trimmed(1, 300, 'Item') });
export const updateChecklistItemSchema = z.object({
  title: trimmed(1, 300, 'Item').optional(),
  done: z.boolean().optional(),
});
export const labelSchema = z.object({ name: trimmed(1, 40, 'Nome'), color: hexColor });
export const taskStatusSchema = z.object({
  name: trimmed(1, 40, 'Nome'),
  category: z.enum(STATUS_CATEGORIES),
  color: hexColor,
});
export const reorderStatusesSchema = z.object({ ids: z.array(id).min(1).max(50) });
export const dependencySchema = z.object({ dependsOnId: id });
export const linkAttachmentSchema = z.object({ url, title: optionalText(200) });

/* ------------------------------------------------------------------ */
/* Projetos e clientes                                                 */
/* ------------------------------------------------------------------ */

export const createProjectSchema = z.object({
  name: trimmed(2, 160, 'Nome'),
  description: optionalText(20000),
  clientId: id.optional().nullable(),
  ownerId: id.optional().nullable(),
  memberIds: z.array(id).max(100).default([]),
  status: z.enum(PROJECT_STATUSES).default('ACTIVE'),
  priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
  startDate: dateOnly.optional().nullable(),
  dueDate: dateOnly.optional().nullable(),
});
export const updateProjectSchema = createProjectSchema
  .omit({ memberIds: true, status: true, priority: true })
  .partial()
  .extend({
    memberIds: z.array(id).max(100).optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
  });

export const clientProfileSchema = z.object({
  targetAudience: optionalText(4000),
  toneOfVoice: optionalText(4000),
  restrictions: optionalText(4000),
  differentiators: optionalText(4000),
  internalNotes: optionalText(8000),
});
export const createClientSchema = z.object({
  name: trimmed(2, 200, 'Nome'),
  displayName: optionalText(120),
  segment: optionalText(80),
  email: email.optional().nullable().or(z.literal('').transform(() => null)),
  phone: optionalText(40),
  website: optionalText(300),
  socials: z.record(z.string().max(40), z.string().max(300)).optional(),
  status: z.enum(CLIENT_STATUSES).default('ACTIVE'),
  notes: optionalText(8000),
  ownerIds: z.array(id).max(20).default([]),
  profile: clientProfileSchema.optional(),
});
export const updateClientSchema = createClientSchema
  .omit({ status: true, ownerIds: true })
  .partial()
  .extend({ status: z.enum(CLIENT_STATUSES).optional(), ownerIds: z.array(id).max(20).optional() });
export const clientContactSchema = z.object({
  name: trimmed(2, 120, 'Nome'),
  email: email.optional().nullable().or(z.literal('').transform(() => null)),
  phone: optionalText(40),
  role: optionalText(80),
});

/* ------------------------------------------------------------------ */
/* Documentos e roteiros                                               */
/* ------------------------------------------------------------------ */

export const documentMetadataSchema = z.object({
  title: trimmed(1, 200, 'Título'),
  kind: z.enum(['DOCUMENT', 'TEMPLATE']).default('DOCUMENT'),
  category: z.enum(DOCUMENT_CATEGORIES).default('OTHER'),
  templateCategory: optionalText(80),
  clientId: id.optional().nullable(),
  projectId: id.optional().nullable(),
  tags: z.array(z.string().trim().max(40)).max(20).default([]),
  notes: optionalText(4000),
  documentDate: dateOnly.optional().nullable(),
});
export const updateDocumentSchema = documentMetadataSchema.omit({ kind: true }).partial();
export const shareLinkSchema = z.object({
  expiresInHours: z.number().int().min(1).max(720).default(72),
  maxDownloads: z.number().int().min(1).max(1000).optional().nullable(),
});

export const createScriptSchema = z.object({
  clientId: id,
  title: trimmed(2, 200, 'Título'),
  format: trimmed(1, 40, 'Formato'),
  campaign: optionalText(120),
  referenceMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido (AAAA-MM)')
    .optional()
    .nullable(),
  status: z.enum(SCRIPT_STATUSES).default('DRAFT'),
  content: z.string().max(50000).default(''),
});
export const updateScriptSchema = createScriptSchema
  .omit({ clientId: true, status: true })
  .partial()
  .extend({ status: z.enum(SCRIPT_STATUSES).optional(), versionNote: optionalText(200) });

/* ------------------------------------------------------------------ */
/* Comercial e contratos                                               */
/* ------------------------------------------------------------------ */

export const createDealSchema = z.object({
  prospectName: trimmed(2, 200, 'Potencial cliente'),
  clientId: id.optional().nullable(),
  segment: optionalText(80),
  source: optionalText(80),
  scope: optionalText(2000),
  valueCents: cents.optional().nullable(),
  proposalDate: dateOnly.optional().nullable(),
  ownerId: id.optional().nullable(),
  stage: z.enum(DEAL_STAGES).default('NEW'),
  nextContactAt: dateOnly.optional().nullable(),
  notes: optionalText(8000),
});
export const updateDealSchema = createDealSchema.omit({ stage: true }).partial();
export const changeDealStageSchema = z
  .object({
    stage: z.enum(DEAL_STAGES),
    wonReason: optionalText(500),
    lostReasonCode: z.enum(Object.keys(DEAL_LOST_REASONS) as [string, ...string[]]).optional().nullable(),
    lostReasonDetail: optionalText(2000),
    nextContactAt: dateOnly.optional().nullable(),
    createClient: z.boolean().optional(),
  })
  .refine((v) => v.stage !== 'LOST' || !!v.lostReasonCode, {
    message: 'Informe o motivo da perda',
    path: ['lostReasonCode'],
  });
export const dealInteractionSchema = z.object({
  type: z.enum(DEAL_INTERACTION_TYPES),
  summary: trimmed(1, 4000, 'Resumo'),
  occurredAt: dateTime.optional(),
});
export const reapproachSchema = z.object({
  nextContactAt: dateOnly.optional().nullable(),
  notes: optionalText(4000),
});

export const createContractSchema = z.object({
  clientId: id,
  service: trimmed(2, 200, 'Serviço'),
  startDate: dateOnly,
  endDate: dateOnly.optional().nullable(),
  monthlyValueCents: cents.optional().nullable(),
  renewalStatus: z.enum(RENEWAL_STATUSES).default('PENDING'),
  notes: optionalText(4000),
});
export const updateContractSchema = createContractSchema.omit({ clientId: true }).partial();
export const endContractSchema = z.object({
  endedAt: dateOnly,
  endReasonCode: z.enum(Object.keys(CONTRACT_END_REASONS) as [string, ...string[]]),
  endReasonDetail: optionalText(4000),
  wantsToReturn: z.enum(RETURN_INTENTIONS),
  futureContactAt: dateOnly.optional().nullable(),
  markClientChurned: z.boolean().default(true),
});

/* ------------------------------------------------------------------ */
/* Notificações, automações e integrações                              */
/* ------------------------------------------------------------------ */

export const notificationPreferencesSchema = z.object({
  preferences: z
    .array(z.object({ type: z.enum(NOTIFICATION_TYPES), inApp: z.boolean(), email: z.boolean() }))
    .max(50),
});

export const automationConditionSchema = z.object({
  field: z.string().max(60),
  operator: z.enum(['eq', 'neq', 'in', 'contains', 'exists']),
  value: z.union([z.string().max(200), z.number(), z.boolean(), z.array(z.string().max(200)).max(50)]).optional(),
});
export const automationActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('notify_assignees'), message: trimmed(1, 500, 'Mensagem') }),
  z.object({ type: z.literal('notify_users'), userIds: z.array(id).min(1).max(20), message: trimmed(1, 500, 'Mensagem') }),
  z.object({ type: z.literal('call_webhook'), webhookId: id }),
  z.object({
    type: z.literal('create_tasks'),
    tasks: z
      .array(
        z.object({
          title: trimmed(1, 300, 'Título'),
          priority: z.enum(TASK_PRIORITIES).default('MEDIUM'),
          dueInDays: z.number().int().min(0).max(365).optional(),
          assignToEventActor: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(30),
  }),
  z.object({ type: z.literal('set_priority'), priority: z.enum(TASK_PRIORITIES) }),
]);
export const automationSchema = z.object({
  name: trimmed(2, 120, 'Nome'),
  enabled: z.boolean().default(true),
  trigger: z.enum(DOMAIN_EVENTS),
  conditions: z.array(automationConditionSchema).max(10).default([]),
  actions: z.array(automationActionSchema).min(1).max(10),
});

export const apiKeySchema = z.object({
  name: trimmed(2, 80, 'Nome'),
  scopes: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).min(1).max(100),
  expiresAt: dateOnly.optional().nullable(),
  rateLimitPerMinute: z.number().int().min(1).max(6000).default(120),
});
export const webhookSchema = z.object({
  url,
  description: optionalText(200),
  events: z.array(z.enum(DOMAIN_EVENTS)).min(1).max(DOMAIN_EVENTS.length),
  enabled: z.boolean().default(true),
});
export const updateWebhookSchema = webhookSchema.partial();

export const smtpConfigSchema = z.object({
  host: trimmed(2, 200, 'Host'),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean().default(false),
  username: optionalText(200),
  /** Omitir para manter a senha atual. */
  password: z.string().max(500).optional(),
  fromEmail: email,
  fromName: optionalText(120),
  replyTo: email.optional().nullable().or(z.literal('').transform(() => null)),
  enabled: z.boolean().default(true),
});
export const smtpTestSchema = z.object({ to: email });

/* ------------------------------------------------------------------ */
/* Jarvis (IA)                                                         */
/* ------------------------------------------------------------------ */

export const aiConfigSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  model: trimmed(2, 120, 'Modelo'),
  /** Omitir para manter a chave atual. */
  apiKey: z.string().trim().max(500).optional(),
  temperature: z.number().min(0).max(2).default(0.3),
  maxOutputTokens: z.number().int().min(128).max(32000).default(2048),
  timeoutMs: z.number().int().min(5000).max(120000).default(45000),
  enabled: z.boolean().default(true),
  monthlyTokenLimit: z.number().int().min(0).max(1_000_000_000).default(2_000_000),
  perUserDailyMessageLimit: z.number().int().min(0).max(10000).default(200),
  requireConfirmationForReversible: z.boolean().default(false),
  allowExternalActions: z.boolean().default(true),
  shareClientData: z.boolean().default(true),
  retentionDays: z.number().int().min(1).max(3650).default(180),
});
export const aiChatSchema = z.object({
  conversationId: id.optional().nullable(),
  message: trimmed(1, 8000, 'Mensagem'),
});
export const aiDecisionSchema = z.object({ approve: z.boolean() });

/* ------------------------------------------------------------------ */
/* SuperAdmin                                                          */
/* ------------------------------------------------------------------ */

export const adminCreateOrganizationSchema = z.object({
  name: trimmed(2, 120, 'Nome'),
  ownerEmail: email,
  ownerName: trimmed(2, 120, 'Nome').optional(),
  planCode: z.string().max(40).optional(),
});
export const adminUpdateOrganizationSchema = z.object({
  name: trimmed(2, 120, 'Nome').optional(),
  planCode: z.string().max(40).optional().nullable(),
  enabledModules: z.array(z.string().max(40)).max(30).optional(),
});
export const adminStatusChangeSchema = z.object({
  reason: trimmed(5, 500, 'Justificativa'),
  confirm: z.string().min(1, 'Digite o nome da organização para confirmar'),
});
export const featureFlagSchema = z.object({
  key: z.string().regex(/^[a-z0-9_.-]{2,60}$/, 'Use letras minúsculas, números, ponto, hífen ou _'),
  description: optionalText(300),
  defaultEnabled: z.boolean().default(false),
});
export const orgFeatureOverrideSchema = z.object({ enabled: z.boolean().nullable() });
export const planSchema = z.object({
  code: z.string().regex(/^[a-z0-9_-]{2,40}$/),
  name: trimmed(2, 80, 'Nome'),
  priceCents: cents.default(0),
  limits: z
    .object({
      maxMembers: z.number().int().min(0).nullable().default(null),
      maxProjects: z.number().int().min(0).nullable().default(null),
      maxStorageMb: z.number().int().min(0).nullable().default(null),
      monthlyAiTokens: z.number().int().min(0).nullable().default(null),
    })
    .default({ maxMembers: null, maxProjects: null, maxStorageMb: null, monthlyAiTokens: null }),
  active: z.boolean().default(true),
});
export const supportGrantSchema = z.object({
  reason: trimmed(15, 1000, 'Justificativa'),
  durationMinutes: z.number().int().min(15).max(240).default(60),
});
export const systemSettingsSchema = z.object({
  allowPublicSignup: z.boolean().optional(),
  maintenanceMessage: optionalText(300),
  aiGloballyEnabled: z.boolean().optional(),
  allowOrgOwnAiKeys: z.boolean().optional(),
});
export const adminCreateUserSchema = z.object({
  name: trimmed(2, 120, 'Nome'),
  email: email,
  password: password,
  isSuperAdmin: z.boolean().default(false),
  organizationId: id.optional().nullable(),
  roleId: id.optional().nullable(),
});
export const adminUpdateUserSchema = z.object({
  name: trimmed(2, 120, 'Nome').optional(),
  email: email.optional(),
  isSuperAdmin: z.boolean().optional(),
  disabled: z.boolean().optional(),
});
export const adminResetPasswordSchema = z.object({
  newPassword: password,
});
export const adminSetModulesSchema = z.object({
  enabledModules: z.array(z.string().max(40)).max(30),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuery>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type RoleInput = z.infer<typeof roleSchema>;
export type AutomationInput = z.infer<typeof automationSchema>;
export type AutomationAction = z.infer<typeof automationActionSchema>;
export type AiConfigInput = z.infer<typeof aiConfigSchema>;
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type ChangeDealStageInput = z.infer<typeof changeDealStageSchema>;
export type DealInteractionInput = z.infer<typeof dealInteractionSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type EndContractInput = z.infer<typeof endContractSchema>;
export type CreateScriptInput = z.infer<typeof createScriptSchema>;
export type UpdateScriptInput = z.infer<typeof updateScriptSchema>;
export type DocumentMetadataInput = z.infer<typeof documentMetadataSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;
export type AdminCreateOrganizationInput = z.infer<typeof adminCreateOrganizationSchema>;
export type AdminUpdateOrganizationInput = z.infer<typeof adminUpdateOrganizationSchema>;
export type AdminStatusChangeInput = z.infer<typeof adminStatusChangeSchema>;
export type FeatureFlagInput = z.infer<typeof featureFlagSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type SupportGrantInput = z.infer<typeof supportGrantSchema>;
export type ApiKeyInput = z.infer<typeof apiKeySchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
export type SmtpConfigInput = z.infer<typeof smtpConfigSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
export type AdminSetModulesInput = z.infer<typeof adminSetModulesSchema>;
