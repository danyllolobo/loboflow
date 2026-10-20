import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import {
  ShieldAlert,
  Building,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  ExternalLink,
  Plus,
  Edit3,
  Trash2,
  Lock,
  Layers,
  FileText,
  Activity,
  Sparkles,
  X,
  Check,
  FolderKanban,
  CheckSquare,
  Bot,
  UserCheck,
  UserX,
  KeyRound,
  Shield,
  Briefcase,
  TrendingUp,
} from 'lucide-react';

interface MetricData {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalTasks: number;
  totalProjects: number;
  ai: { totalCalls: number; totalTokens: number };
}

export function SuperAdminPage() {
  const { user, switchOrganization } = useAuth();
  const [tab, setTab] = useState<'overview' | 'accounts' | 'users' | 'modules' | 'audit'>('overview');

  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [systemModules, setSystemModules] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros de busca
  const [orgSearch, setOrgSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Modais de Organização
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [editOrgModal, setEditOrgModal] = useState<any | null>(null);
  const [deleteOrgModal, setDeleteOrgModal] = useState<any | null>(null);
  const [suspendModalOrg, setSuspendModalOrg] = useState<any | null>(null);
  const [orgModulesModal, setOrgModulesModal] = useState<any | null>(null);

  // Form Criar Org
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgOwnerEmail, setNewOrgOwnerEmail] = useState('');
  const [newOrgOwnerName, setNewOrgOwnerName] = useState('');
  const [newOrgPlanCode, setNewOrgPlanCode] = useState('PRO');
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Form Editar Org
  const [editOrgName, setEditOrgName] = useState('');
  const [editOrgSlug, setEditOrgSlug] = useState('');
  const [editOrgStatus, setEditOrgStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [savingOrgEdit, setSavingOrgEdit] = useState(false);

  // Form Deletar Org
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deletingOrg, setDeletingOrg] = useState(false);

  // Form Suspender Org
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendConfirmName, setSuspendConfirmName] = useState('');

  // Form Módulos Org
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState(false);

  // Modais de Usuário
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [editUserModal, setEditUserModal] = useState<any | null>(null);
  const [resetPassModal, setResetPassModal] = useState<any | null>(null);
  const [deleteUserModal, setDeleteUserModal] = useState<any | null>(null);

  // Form Criar Usuário
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserIsSuperAdmin, setNewUserIsSuperAdmin] = useState(false);
  const [newUserOrgId, setNewUserOrgId] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Form Editar Usuário
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserIsSuperAdmin, setEditUserIsSuperAdmin] = useState(false);
  const [editUserDisabled, setEditUserDisabled] = useState(false);
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  // Form Reset Senha
  const [resetPasswordNew, setResetPasswordNew] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, orgs, users, mods, logs] = await Promise.all([
        api.get<MetricData | null>('/superadmin/metrics').catch(() => null),
        api.get<any[]>('/superadmin/organizations').catch(() => []),
        api.get<any[]>('/superadmin/users').catch(() => []),
        api.get<{ modules: any[]; accounts: any[] }>('/superadmin/modules').catch(() => ({ modules: [], accounts: [] })),
        api.get<any[]>('/superadmin/audit-logs').catch(() => []),
      ]);
      setMetrics(m);
      setOrganizations(Array.isArray(orgs) ? orgs : []);
      setUsersList(Array.isArray(users) ? users : []);
      setSystemModules(mods?.modules || []);
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error('Falha ao carregar dados do superadmin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fechar qualquer modal ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCreateOrgModalOpen(false);
        setEditOrgModal(null);
        setDeleteOrgModal(null);
        setSuspendModalOrg(null);
        setOrgModulesModal(null);
        setCreateUserModalOpen(false);
        setEditUserModal(null);
        setResetPassModal(null);
        setDeleteUserModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* --- HANDLERS ORGANIZAÇÕES --- */
  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim() || !newOrgOwnerEmail.trim()) return;

    try {
      setCreatingOrg(true);
      await api.post('/superadmin/organizations', {
        name: newOrgName.trim(),
        ownerEmail: newOrgOwnerEmail.trim(),
        ownerName: newOrgOwnerName.trim() || undefined,
        planCode: newOrgPlanCode || undefined,
      });
      setCreateOrgModalOpen(false);
      setNewOrgName('');
      setNewOrgOwnerEmail('');
      setNewOrgOwnerName('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar organização');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleOpenEditOrg = (org: any) => {
    setEditOrgModal(org);
    setEditOrgName(org.name);
    setEditOrgSlug(org.slug);
    setEditOrgStatus(org.status);
  };

  const handleSaveEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editOrgModal || !editOrgName.trim()) return;

    try {
      setSavingOrgEdit(true);
      await api.patch(`/superadmin/organizations/${editOrgModal.id}`, {
        name: editOrgName.trim(),
        slug: editOrgSlug.trim() || undefined,
        status: editOrgStatus,
      });
      setEditOrgModal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações da organização');
    } finally {
      setSavingOrgEdit(false);
    }
  };

  const handleDeleteOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteOrgModal || deleteConfirmName !== deleteOrgModal.name) return;

    try {
      setDeletingOrg(true);
      await api.delete(`/superadmin/organizations/${deleteOrgModal.id}?confirm=${encodeURIComponent(deleteConfirmName)}`);
      setDeleteOrgModal(null);
      setDeleteConfirmName('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir organização');
    } finally {
      setDeletingOrg(false);
    }
  };

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendModalOrg) return;

    try {
      await api.post(`/superadmin/organizations/${suspendModalOrg.id}/suspend`, {
        reason: suspendReason,
        confirm: suspendConfirmName,
      });
      setSuspendModalOrg(null);
      setSuspendReason('');
      setSuspendConfirmName('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao suspender organização');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.post(`/superadmin/organizations/${id}/activate`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao reativar organização');
    }
  };

  const handleOpenModules = (org: any) => {
    setOrgModulesModal(org);
    setSelectedModules(org.enabledModules || []);
  };

  const handleSaveModules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgModulesModal) return;

    try {
      setSavingModules(true);
      await api.post(`/superadmin/organizations/${orgModulesModal.id}/modules`, {
        enabledModules: selectedModules,
      });
      setOrgModulesModal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar módulos');
    } finally {
      setSavingModules(false);
    }
  };

  /* --- HANDLERS USUÁRIOS --- */
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) return;

    try {
      setCreatingUser(true);
      await api.post('/superadmin/users', {
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        isSuperAdmin: newUserIsSuperAdmin,
        organizationId: newUserOrgId || undefined,
      });
      setCreateUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserIsSuperAdmin(false);
      setNewUserOrgId('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar usuário');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleOpenEditUser = (u: any) => {
    setEditUserModal(u);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserIsSuperAdmin(u.isSuperAdmin);
    setEditUserDisabled(!!u.disabledAt);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserModal || !editUserName.trim() || !editUserEmail.trim()) return;

    try {
      setSavingUserEdit(true);
      await api.patch(`/superadmin/users/${editUserModal.id}`, {
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        isSuperAdmin: editUserIsSuperAdmin,
        disabled: editUserDisabled,
      });
      setEditUserModal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar usuário');
    } finally {
      setSavingUserEdit(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModal || resetPasswordNew.length < 8) {
      alert('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }

    try {
      setResettingPassword(true);
      await api.post(`/superadmin/users/${resetPassModal.id}/reset-password`, {
        newPassword: resetPasswordNew,
      });
      setResetPassModal(null);
      setResetPasswordNew('');
      alert('Senha redefinida com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao redefinir senha');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserModal) return;
    try {
      await api.delete(`/superadmin/users/${deleteUserModal.id}`);
      setDeleteUserModal(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir usuário');
    }
  };

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
      o.slug.toLowerCase().includes(orgSearch.toLowerCase()),
  );

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <Clock className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando Console SuperAdmin SaaS...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Estilo Chatwoot Super Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-purple-950/40 via-card to-card border border-purple-500/30 shadow-md">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-sm shrink-0">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
                Console SuperAdmin SaaS
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                Instância Multi-Tenant
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Controle absoluto de contas, usuários globais, licenças e matriz de módulos do LoboFlow.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCreateOrgModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Nova Conta
          </button>
          <button
            onClick={() => setCreateUserModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Users className="h-4 w-4" /> Novo Usuário
          </button>
        </div>
      </div>

      {/* Navegação por Abas Chatwoot-Style */}
      <div className="flex border-b border-border gap-2 sm:gap-6 text-sm font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setTab('overview')}
          className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'overview'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Activity className="h-4 w-4" /> Visão Geral & Métricas
        </button>

        <button
          onClick={() => setTab('accounts')}
          className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'accounts'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building className="h-4 w-4" /> Contas / Workspaces ({organizations.length})
        </button>

        <button
          onClick={() => setTab('users')}
          className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'users'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" /> Usuários Globais ({usersList.length})
        </button>

        <button
          onClick={() => setTab('modules')}
          className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'modules'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="h-4 w-4" /> Módulos do Sistema ({systemModules.length})
        </button>

        <button
          onClick={() => setTab('audit')}
          className={`pb-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'audit'
              ? 'border-purple-500 text-purple-400 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" /> Auditoria & Governança
        </button>
      </div>

      {/* TAB 1: VISÃO GERAL */}
      {tab === 'overview' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-purple-400" /> Total de Contas
              </span>
              <div className="text-2xl font-bold font-display mt-2 text-foreground">
                {metrics.totalOrganizations}
              </div>
              <span className="text-[11px] text-emerald-400 font-medium">
                {metrics.activeOrganizations} ativas no momento
              </span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" /> Usuários na Plataforma
              </span>
              <div className="text-2xl font-bold font-display mt-2 text-foreground">
                {metrics.totalUsers}
              </div>
              <span className="text-[11px] text-muted-foreground">Cadastros totais</span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <CheckSquare className="h-3.5 w-3.5 text-blue-400" /> Demandas em Execução
              </span>
              <div className="text-2xl font-bold font-display mt-2 text-foreground">
                {metrics.totalTasks}
              </div>
              <span className="text-[11px] text-muted-foreground">Tarefas cadastradas</span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sky-400" /> Consumo Jarvis IA
              </span>
              <div className="text-2xl font-bold font-display mt-2 text-foreground">
                {metrics.ai.totalCalls}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {(metrics.ai.totalTokens / 1000).toFixed(1)}k tokens processados
              </span>
            </div>
          </div>

          {/* Atalhos Rápidos de Operação */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div
              onClick={() => setTab('accounts')}
              className="p-5 rounded-2xl bg-card border border-border hover:border-purple-500/50 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground group-hover:text-purple-400 transition-colors">
                  Gerenciar Contas & Planos
                </h4>
                <Building className="h-4 w-4 text-purple-400" />
              </div>
              <p className="text-xs text-muted-foreground">
                Provisione novas empresas clientes, defina planos de assinatura e monitore quotas.
              </p>
            </div>

            <div
              onClick={() => setTab('users')}
              className="p-5 rounded-2xl bg-card border border-border hover:border-purple-500/50 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground group-hover:text-purple-400 transition-colors">
                  Controle de Usuários
                </h4>
                <Users className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                Gerencie credenciais, promova administradores e controle acessos desativados.
              </p>
            </div>

            <div
              onClick={() => setTab('modules')}
              className="p-5 rounded-2xl bg-card border border-border hover:border-purple-500/50 transition-all cursor-pointer space-y-2 group"
            >
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-foreground group-hover:text-purple-400 transition-colors">
                  Matriz de Módulos & IA
                </h4>
                <Layers className="h-4 w-4 text-sky-400" />
              </div>
              <p className="text-xs text-muted-foreground">
                Habilite ou restrinja módulos específicos (CRM, Roteiros, Tarefas, Jarvis) para cada cliente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONTAS / WORKSPACES */}
      {tab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar conta por nome ou slug..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {filteredOrgs.length} conta(s) encontrada(s)
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Conta / Workspace</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Módulos Ativos</th>
                    <th className="p-4">Membros</th>
                    <th className="p-4">Tarefas / Projetos</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOrgs.map((org) => {
                    const isSuspended = org.status === 'SUSPENDED';
                    const activeModulesCount = org.enabledModules?.length || 0;

                    return (
                      <tr key={org.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-foreground text-sm flex items-center gap-2">
                            {org.name}
                            {org.plan && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                {org.plan.name}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                            slug: {org.slug} • ID: {org.id.slice(0, 8)}...
                          </div>
                        </td>

                        <td className="p-4">
                          {isSuspended ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="h-3 w-3" /> Suspensa
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" /> Ativa
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => handleOpenModules(org)}
                            className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer border border-border"
                          >
                            <Layers className="h-3 w-3 text-purple-400" />
                            {activeModulesCount} módulos
                          </button>
                        </td>

                        <td className="p-4 font-semibold text-foreground">
                          {org._count?.memberships || 0} usuário(s)
                        </td>

                        <td className="p-4 text-muted-foreground">
                          <span className="font-semibold text-foreground">{org._count?.tasks || 0}</span> tarefas •{' '}
                          <span className="font-semibold text-foreground">{org._count?.projects || 0}</span> projetos
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditOrg(org)}
                              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Editar Conta"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            {isSuspended ? (
                              <button
                                onClick={() => handleActivate(org.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold text-[11px] cursor-pointer"
                                title="Reativar Acesso"
                              >
                                Reativar
                              </button>
                            ) : (
                              <button
                                onClick={() => setSuspendModalOrg(org)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-[11px] cursor-pointer"
                                title="Suspender Acesso"
                              >
                                Suspender
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setDeleteOrgModal(org);
                                setDeleteConfirmName('');
                              }}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                              title="Excluir Conta Permanentemente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USUÁRIOS GLOBAIS */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar usuário por nome ou email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              {filteredUsers.length} usuário(s) cadastrado(s)
            </span>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Usuário</th>
                    <th className="p-4">Permissão Global</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Contas Vinculadas</th>
                    <th className="p-4">Último Acesso</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredUsers.map((u) => {
                    const isDisabled = !!u.disabledAt;

                    return (
                      <tr key={u.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {u.name?.[0] || 'U'}
                            </div>
                            <div>
                              <div className="font-bold text-foreground text-sm">{u.name}</div>
                              <div className="text-muted-foreground text-[11px]">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          {u.isSuperAdmin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              <ShieldAlert className="h-3 w-3" /> SuperAdmin
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-xs">Usuário Comum</span>
                          )}
                        </td>

                        <td className="p-4">
                          {isDisabled ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400">
                              <UserX className="h-3 w-3" /> Desativado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                              <UserCheck className="h-3 w-3" /> Ativo
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {u.memberships?.length > 0 ? (
                              u.memberships.map((m: any) => (
                                <span
                                  key={m.id}
                                  className="text-[10px] px-2 py-0.5 rounded bg-secondary text-foreground font-medium border border-border"
                                >
                                  {m.organization?.name} ({m.role?.name})
                                </span>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-[11px] italic">Sem vínculo</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-muted-foreground text-[11px]">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('pt-BR') : 'Nunca acessou'}
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Editar Usuário"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              onClick={() => {
                                setResetPassModal(u);
                                setResetPasswordNew('');
                              }}
                              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-amber-400 transition-colors cursor-pointer"
                              title="Redefinir Senha"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>

                            {u.id !== user?.id && (
                              <button
                                onClick={() => setDeleteUserModal(u)}
                                className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                                title="Excluir Usuário"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MÓDULOS DO SISTEMA */}
      {tab === 'modules' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-1">
            <h3 className="font-bold text-sm text-foreground">Matriz de Habilitação Modular</h3>
            <p className="text-xs text-muted-foreground">
              O LoboFlow é 100% modular. Você pode liberar ou bloquear funcionalidades específicas para cada empresa cliente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {systemModules.map((mod) => {
              const enabledAccounts = organizations.filter((o) =>
                o.enabledModules?.includes(mod.id),
              );

              return (
                <div
                  key={mod.id}
                  className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <Layers className="h-4 w-4 text-purple-400" />
                        {mod.name}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                      ID: {mod.id}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Habilitado em <strong className="text-foreground">{enabledAccounts.length}</strong> de {organizations.length} contas
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: AUDITORIA */}
      {tab === 'audit' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border font-bold text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-400" />
            Trilha de Auditoria & Governança do Servidor
          </div>

          <div className="divide-y divide-border/60 max-h-[600px] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Nenhum log registrado recentemente.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between text-xs hover:bg-secondary/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-400">{log.action}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground uppercase font-semibold">
                        {log.actorType}
                      </span>
                    </div>
                    {log.metadata && (
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAIS (COM DISMISS AO CLICAR FORA E ESC)                             */}
      {/* ===================================================================== */}

      {/* Modal: Nova Conta */}
      {createOrgModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateOrgModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display text-foreground">Provisionar Nova Conta SaaS</h2>
              <button
                onClick={() => setCreateOrgModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome da Empresa / Organização *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Imobiliária Santos"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">E-mail do Administrador *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@empresa.com"
                    value={newOrgOwnerEmail}
                    onChange={(e) => setNewOrgOwnerEmail(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Nome do Administrador</label>
                  <input
                    type="text"
                    placeholder="Nome do cliente"
                    value={newOrgOwnerName}
                    onChange={(e) => setNewOrgOwnerName(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                A organização será criada com papéis RBAC e status padrão do Kanban pré-configurados. Caso o usuário não exista, uma senha temporária será atribuída.
              </p>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateOrgModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingOrg}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {creatingOrg ? 'Provisionando...' : 'Criar Conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Conta */}
      {editOrgModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditOrgModal(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display text-foreground">Editar Conta</h2>
              <button
                onClick={() => setEditOrgModal(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome da Organização *</label>
                <input
                  type="text"
                  required
                  value={editOrgName}
                  onChange={(e) => setEditOrgName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Slug da URL</label>
                <input
                  type="text"
                  value={editOrgSlug}
                  onChange={(e) => setEditOrgSlug(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Status da Conta</label>
                <select
                  value={editOrgStatus}
                  onChange={(e) => setEditOrgStatus(e.target.value as any)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                >
                  <option value="ACTIVE">Ativa (Acesso Liberado)</option>
                  <option value="SUSPENDED">Suspensa (Bloqueada)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditOrgModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingOrgEdit}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingOrgEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerenciar Módulos da Conta */}
      {orgModulesModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setOrgModulesModal(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold font-display text-foreground">Módulos Liberados</h2>
                <p className="text-xs text-muted-foreground">{orgModulesModal.name}</p>
              </div>
              <button
                onClick={() => setOrgModulesModal(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModules} className="space-y-4">
              <div className="space-y-2">
                {systemModules.map((m) => {
                  const isChecked = selectedModules.includes(m.id);

                  return (
                    <label
                      key={m.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-xs text-foreground">{m.name}</div>
                        <div className="text-[11px] text-muted-foreground">{m.description}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedModules([...selectedModules, m.id]);
                          } else {
                            setSelectedModules(selectedModules.filter((id) => id !== m.id));
                          }
                        }}
                        className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOrgModulesModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingModules}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingModules ? 'Salvando...' : 'Salvar Módulos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Excluir Conta */}
      {deleteOrgModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteOrgModal(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-rose-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-rose-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Excluir Conta Permanentemente
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Esta ação é <strong>irreversível</strong>. Todos os dados, tarefas, clientes e projetos vinculados à organização <strong className="text-foreground">{deleteOrgModal.name}</strong> serão apagados.
            </p>

            <form onSubmit={handleDeleteOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Digite <span className="font-mono text-foreground font-bold">{deleteOrgModal.name}</span> para confirmar:
                </label>
                <input
                  type="text"
                  required
                  placeholder={deleteOrgModal.name}
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setDeleteOrgModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={deletingOrg || deleteConfirmName !== deleteOrgModal.name}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {deletingOrg ? 'Excluindo...' : 'Confirmar Exclusão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Suspender Organização */}
      {suspendModalOrg && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSuspendModalOrg(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-rose-500 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Suspender Organização
            </h2>
            <p className="text-xs text-muted-foreground">
              A suspensão bloqueará o acesso de todos os colaboradores da empresa imediatamente.
            </p>

            <form onSubmit={handleSuspend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Justificativa *</label>
                <textarea
                  required
                  rows={3}
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Ex.: Inadimplência na fatura ou solicitação de cancelamento"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Digite <span className="font-mono text-foreground font-bold">{suspendModalOrg.name}</span> para confirmar:
                </label>
                <input
                  type="text"
                  required
                  value={suspendConfirmName}
                  onChange={(e) => setSuspendConfirmName(e.target.value)}
                  placeholder={suspendModalOrg.name}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSuspendModalOrg(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={suspendConfirmName !== suspendModalOrg.name || !suspendReason.trim()}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Confirmar Suspensão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Usuário */}
      {createUserModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateUserModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display text-foreground">Cadastrar Novo Usuário Global</h2>
              <button
                onClick={() => setCreateUserModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do usuário"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">E-mail de Acesso *</label>
                <input
                  type="email"
                  required
                  placeholder="usuario@dominio.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Senha Inicial *</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Vincular a uma Conta (Opcional)</label>
                <select
                  value={newUserOrgId}
                  onChange={(e) => setNewUserOrgId(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                >
                  <option value="">Nenhuma conta inicial</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-purple-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserIsSuperAdmin}
                    onChange={(e) => setNewUserIsSuperAdmin(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  Conceder Acesso de SuperAdmin da Instância
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {creatingUser ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Usuário */}
      {editUserModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditUserModal(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display text-foreground">Editar Usuário</h2>
              <button
                onClick={() => setEditUserModal(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">E-mail *</label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-purple-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editUserIsSuperAdmin}
                    onChange={(e) => setEditUserIsSuperAdmin(e.target.checked)}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  Acesso de SuperAdmin
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-rose-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editUserDisabled}
                    onChange={(e) => setEditUserDisabled(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                  />
                  Conta Desativada / Bloqueada
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditUserModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUserEdit}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingUserEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Redefinir Senha de Usuário */}
      {resetPassModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setResetPassModal(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-500" /> Redefinir Senha
            </h2>
            <p className="text-xs text-muted-foreground">
              Defina uma nova senha para <strong className="text-foreground">{resetPassModal.name}</strong> ({resetPassModal.email}). Todas as outras sessões ativas serão desconectadas.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nova Senha *</label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={resetPasswordNew}
                  onChange={(e) => setResetPasswordNew(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setResetPassModal(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resettingPassword || resetPasswordNew.length < 8}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {resettingPassword ? 'Atualizando...' : 'Redefinir Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Excluir Usuário */}
      {deleteUserModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteUserModal(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-rose-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-rose-500 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Excluir Usuário Global
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Deseja realmente remover o usuário <strong className="text-foreground">{deleteUserModal.name}</strong> ({deleteUserModal.email})? Todos os acessos e memberships serão revogados.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteUserModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-sm cursor-pointer"
              >
                Sim, Excluir Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
