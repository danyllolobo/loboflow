/**
 * Catálogo central de módulos e permissões do LoboFlow.
 *
 * Este arquivo é a fonte de verdade para chaves de permissão. O backend
 * sincroniza este catálogo com a tabela `Permission` (seed idempotente)
 * e valida toda operação usando estas chaves. O frontend usa as mesmas
 * chaves apenas para ajustar a interface — nunca como mecanismo de segurança.
 */

export const PERMISSION_SCOPES = ['ALL', 'ASSIGNED', 'OWN'] as const;
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];

export interface ModuleDefinition {
  key: string;
  label: string;
  /** Pode ser desligado por organização (ex.: comercial para quem não é agência). */
  toggleable: boolean;
  actions: readonly { key: string; label: string; scoped?: boolean; level?: 'normal' | 'sensitive' }[];
}

export const MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    toggleable: false,
    actions: [{ key: 'view', label: 'Visualizar' }],
  },
  {
    key: 'tasks',
    label: 'Tarefas',
    toggleable: false,
    actions: [
      { key: 'view', label: 'Visualizar', scoped: true },
      { key: 'create', label: 'Criar' },
      { key: 'edit', label: 'Editar', scoped: true },
      { key: 'delete', label: 'Arquivar/Excluir', level: 'sensitive' },
      { key: 'assign', label: 'Atribuir responsáveis' },
      { key: 'change_status', label: 'Alterar status', scoped: true },
      { key: 'export', label: 'Exportar' },
    ],
  },
  {
    key: 'projects',
    label: 'Projetos',
    toggleable: false,
    actions: [
      { key: 'view', label: 'Visualizar', scoped: true },
      { key: 'create', label: 'Criar' },
      { key: 'edit', label: 'Editar', scoped: true },
      { key: 'delete', label: 'Arquivar/Excluir', level: 'sensitive' },
      { key: 'assign', label: 'Gerenciar equipe' },
      { key: 'export', label: 'Exportar' },
    ],
  },
  {
    key: 'clients',
    label: 'Clientes',
    toggleable: true,
    actions: [
      { key: 'view', label: 'Visualizar', scoped: true },
      { key: 'create', label: 'Criar' },
      { key: 'edit', label: 'Editar', scoped: true },
      { key: 'delete', label: 'Arquivar/Excluir', level: 'sensitive' },
      { key: 'view_commercial', label: 'Ver dados comerciais', level: 'sensitive' },
      { key: 'export', label: 'Exportar' },
    ],
  },
  {
    key: 'team',
    label: 'Equipe',
    toggleable: false,
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'invite', label: 'Convidar' },
      { key: 'edit', label: 'Alterar papéis', level: 'sensitive' },
      { key: 'remove', label: 'Remover membros', level: 'sensitive' },
    ],
  },
  {
    key: 'documents',
    label: 'Documentos',
    toggleable: true,
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'create', label: 'Enviar' },
      { key: 'edit', label: 'Editar' },
      { key: 'delete', label: 'Excluir', level: 'sensitive' },
      { key: 'share', label: 'Compartilhar externamente', level: 'sensitive' },
      { key: 'view_contracts', label: 'Ver documentos contratuais', level: 'sensitive' },
    ],
  },
  {
    key: 'scripts',
    label: 'Roteiros e conteúdo',
    toggleable: true,
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'create', label: 'Criar' },
      { key: 'edit', label: 'Editar' },
      { key: 'delete', label: 'Excluir', level: 'sensitive' },
      { key: 'approve', label: 'Aprovar' },
    ],
  },
  {
    key: 'commercial',
    label: 'Comercial',
    toggleable: true,
    actions: [
      { key: 'view', label: 'Visualizar', scoped: true },
      { key: 'create', label: 'Criar' },
      { key: 'edit', label: 'Editar', scoped: true },
      { key: 'delete', label: 'Excluir', level: 'sensitive' },
      { key: 'export', label: 'Exportar' },
    ],
  },
  {
    key: 'contracts',
    label: 'Contratos',
    toggleable: true,
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'create', label: 'Criar' },
      { key: 'edit', label: 'Editar/Encerrar', level: 'sensitive' },
      { key: 'delete', label: 'Excluir', level: 'sensitive' },
    ],
  },
  {
    key: 'reports',
    label: 'Relatórios',
    toggleable: false,
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'export', label: 'Exportar' },
    ],
  },
  {
    key: 'automations',
    label: 'Automações',
    toggleable: true,
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'manage', label: 'Gerenciar', level: 'sensitive' },
    ],
  },
  {
    key: 'integrations',
    label: 'Integrações',
    toggleable: false,
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'manage', label: 'Gerenciar API keys e webhooks', level: 'sensitive' },
    ],
  },
  {
    key: 'ai',
    label: 'IA (Jarvis)',
    toggleable: true,
    actions: [
      { key: 'use', label: 'Usar o Jarvis' },
      { key: 'manage', label: 'Configurar provedor e políticas', level: 'sensitive' },
    ],
  },
  {
    key: 'settings',
    label: 'Configurações',
    toggleable: false,
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'manage', label: 'Administrar', level: 'sensitive' },
    ],
  },
  {
    key: 'audit',
    label: 'Auditoria',
    toggleable: false,
    actions: [{ key: 'view', label: 'Visualizar logs', level: 'sensitive' }],
  },
] as const satisfies readonly ModuleDefinition[];

type ModuleUnion = (typeof MODULES)[number];
export type ModuleKey = ModuleUnion['key'];
export type PermissionKey = {
  [M in ModuleUnion as M['key']]: `${M['key']}.${M['actions'][number]['key']}`;
}[ModuleKey];

export const ALL_PERMISSIONS: PermissionKey[] = MODULES.flatMap((m) =>
  m.actions.map((a) => `${m.key}.${a.key}` as PermissionKey),
);

export const SCOPED_PERMISSIONS = new Set<string>(
  MODULES.flatMap((m) =>
    m.actions.filter((a) => 'scoped' in a && a.scoped).map((a) => `${m.key}.${a.key}`),
  ),
);

export const TOGGLEABLE_MODULES = MODULES.filter((m) => m.toggleable).map((m) => m.key);

/** Módulo dono de uma permissão (ex.: "tasks.create" → "tasks"). */
export function permissionModule(permission: string): string {
  return permission.split('.')[0] ?? '';
}

export function isPermissionKey(value: string): value is PermissionKey {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

export interface RoleTemplate {
  key: string;
  name: string;
  description: string;
  isOwner?: boolean;
  permissions: { key: PermissionKey; scope?: PermissionScope }[];
}

const all = (keys: PermissionKey[], scope: PermissionScope = 'ALL') => keys.map((key) => ({ key, scope }));
const byModule = (mod: ModuleKey, scope: PermissionScope = 'ALL') =>
  all(
    ALL_PERMISSIONS.filter((p) => p.startsWith(`${mod}.`)),
    scope,
  );

/**
 * Papéis criados automaticamente em toda nova organização.
 * Todos (exceto o Proprietário) podem ser editados ou removidos pela organização.
 */
export const DEFAULT_ROLE_TEMPLATES: RoleTemplate[] = [
  {
    key: 'owner',
    name: 'Proprietário',
    description: 'Acesso total. Não pode ser editado nem removido.',
    isOwner: true,
    permissions: all(ALL_PERMISSIONS),
  },
  {
    key: 'admin',
    name: 'Administrador',
    description: 'Administra a organização, membros e configurações.',
    permissions: all(ALL_PERMISSIONS),
  },
  {
    key: 'manager',
    name: 'Gestor',
    description: 'Coordena projetos, tarefas, clientes e equipe.',
    permissions: [
      ...byModule('dashboard'),
      ...byModule('tasks'),
      ...byModule('projects'),
      ...all(['clients.view', 'clients.create', 'clients.edit', 'clients.export']),
      ...all(['team.view', 'team.invite']),
      ...all(['documents.view', 'documents.create', 'documents.edit', 'documents.share']),
      ...byModule('scripts'),
      ...byModule('reports'),
      ...all(['automations.view', 'automations.manage', 'integrations.view', 'ai.use', 'settings.view']),
    ],
  },
  {
    key: 'member',
    name: 'Colaborador',
    description: 'Executa tarefas e colabora em projetos.',
    permissions: [
      ...all(['dashboard.view', 'tasks.view', 'tasks.create', 'tasks.assign', 'projects.view', 'clients.view']),
      ...all(['tasks.edit', 'tasks.change_status'], 'ALL'),
      ...all(['team.view', 'documents.view', 'documents.create', 'scripts.view', 'scripts.create', 'scripts.edit']),
      ...all(['reports.view', 'ai.use', 'settings.view']),
    ],
  },
  {
    key: 'sales',
    name: 'Comercial',
    description: 'Negociações, carteira e relacionamento com clientes.',
    permissions: [
      ...all(['dashboard.view', 'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.change_status', 'projects.view']),
      ...byModule('clients'),
      ...byModule('commercial'),
      ...all(['contracts.view', 'documents.view', 'documents.create', 'team.view', 'reports.view', 'ai.use']),
    ],
  },
  {
    key: 'finance',
    name: 'Financeiro',
    description: 'Contratos, valores e relatórios.',
    permissions: [
      ...all(['dashboard.view', 'tasks.view', 'projects.view', 'clients.view', 'clients.view_commercial']),
      ...byModule('contracts'),
      ...all(['commercial.view', 'documents.view', 'documents.view_contracts', 'team.view']),
      ...byModule('reports'),
      ...all(['ai.use']),
    ],
  },
  {
    key: 'viewer',
    name: 'Visualizador',
    description: 'Somente leitura.',
    permissions: all([
      'dashboard.view',
      'tasks.view',
      'projects.view',
      'clients.view',
      'team.view',
      'documents.view',
      'scripts.view',
      'reports.view',
    ]),
  },
  {
    key: 'guest',
    name: 'Cliente convidado',
    description: 'Acesso restrito às tarefas e projetos em que foi incluído.',
    permissions: [
      ...all(['tasks.view', 'tasks.change_status', 'projects.view'], 'ASSIGNED'),
      ...all(['dashboard.view']),
    ],
  },
];
