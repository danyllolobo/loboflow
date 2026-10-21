import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import {
  User,
  Building,
  Building2,
  Users,
  Shield,
  Columns3,
  ShieldAlert,
  Key,
  Check,
  Lock,
  UserPlus,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Edit3,
} from 'lucide-react';

export function SettingsPage() {
  const { user, activeOrg, memberships, switchOrganization, refreshMe } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = (searchParams.get('tab') as any) || 'profile';

  const [tab, setTab] = useState<'profile' | 'general' | 'organizations' | 'members' | 'roles' | 'kanban' | 'superadmin'>(
    ['profile', 'general', 'organizations', 'members', 'roles', 'kanban', 'superadmin'].includes(currentTab)
      ? currentTab
      : 'profile',
  );

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);

  // Criação de Nova Empresa
  const autoCreate = searchParams.get('create') === 'true';
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(autoCreate);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgTimezone, setNewOrgTimezone] = useState('America/Sao_Paulo');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgCreateSuccess, setOrgCreateSuccess] = useState(false);
  const [orgCreateError, setOrgCreateError] = useState<string | null>(null);

  // Perfil
  const [userName, setUserName] = useState(user?.name || '');
  const [userTimezone, setUserTimezone] = useState(user?.timezone || 'America/Sao_Paulo');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Alterar Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Organização
  const [orgName, setOrgName] = useState('');
  const [orgTimezone, setOrgTimezone] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgSuccess, setOrgSuccess] = useState(false);

  // Convite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  // Nova Coluna Kanban
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#3b82f6');
  const [statusSaving, setStatusSaving] = useState(false);

  // Edição de Coluna de Status Existente
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editStatusName, setEditStatusName] = useState('');
  const [editStatusColor, setEditStatusColor] = useState('#3b82f6');
  const [isSavingStatusEdit, setIsSavingStatusEdit] = useState(false);

  const setTabAndQuery = (newTab: typeof tab) => {
    setTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgRes, membersRes, rolesRes, statusesRes]: [any, any, any, any] = await Promise.all([
        api.get('/organizations/current').catch(() => null),
        api.get('/organizations/current/members').catch(() => []),
        api.get('/organizations/current/roles').catch(() => []),
        api.get('/tasks/statuses').catch(() => []),
      ]);

      if (orgRes) {
        setOrg(orgRes);
        setOrgName(orgRes.name || '');
        setOrgTimezone(orgRes.timezone || 'America/Sao_Paulo');
      }
      setMembers(Array.isArray(membersRes) ? membersRes : []);
      setRoles(Array.isArray(rolesRes) ? rolesRes : []);
      setStatuses(Array.isArray(statusesRes) ? statusesRes : []);

      if (rolesRes?.length > 0 && !inviteRoleId) {
        setInviteRoleId(rolesRes[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (user) {
      setUserName(user.name);
      setUserTimezone(user.timezone || 'America/Sao_Paulo');
    }
  }, [activeOrg?.organizationId, user?.id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;
    try {
      setProfileSaving(true);
      await api.patch('/auth/profile', {
        name: userName.trim(),
        timezone: userTimezone,
      });
      await refreshMe();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar perfil');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da nova senha não confere.');
      return;
    }

    try {
      setPasswordSaving(true);
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Erro ao alterar senha. Verifique sua senha atual.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) {
      setOrgCreateError('O nome da empresa é obrigatório.');
      return;
    }
    setOrgCreateError(null);
    setCreatingOrg(true);
    try {
      const res: any = await api.post('/organizations', {
        name: newOrgName.trim(),
        timezone: newOrgTimezone || 'America/Sao_Paulo',
      });
      setNewOrgName('');
      setOrgCreateSuccess(true);
      setShowCreateOrgModal(false);
      await refreshMe();
      if (res?.id) {
        switchOrganization(res.id);
      }
    } catch (err: any) {
      setOrgCreateError(err.message || 'Erro ao criar empresa. Verifique os dados e tente novamente.');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleSaveOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setOrgSaving(true);
      await api.patch('/organizations/current', {
        name: orgName.trim(),
        timezone: orgTimezone,
      });
      setOrgSuccess(true);
      setTimeout(() => setOrgSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações da empresa');
    } finally {
      setOrgSaving(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteRoleId) return;

    try {
      setInviting(true);
      const res: any = await api.post('/organizations/current/invitations', {
        email: inviteEmail.trim(),
        roleId: inviteRoleId,
      });
      setInviteResult(`Convite enviado com sucesso! Token de acesso: ${res.inviteToken || 'Ativo'}`);
      setInviteEmail('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao convidar');
    } finally {
      setInviting(false);
    }
  };

  const handleCreateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName.trim()) return;

    try {
      setStatusSaving(true);
      await api.post('/tasks/statuses', {
        name: newStatusName.trim(),
        color: newStatusColor,
      });
      setNewStatusName('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar status');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteStatus = async (id: string, name: string) => {
    if (!confirm(`Deseja remover a coluna "${name}"? Tarefas vinculadas impedem a exclusão.`)) return;
    try {
      await api.delete(`/tasks/statuses/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir status');
    }
  };

  const handleStartEditStatus = (st: any) => {
    setEditingStatusId(st.id);
    setEditStatusName(st.name);
    setEditStatusColor(st.color || '#3b82f6');
  };

  const handleSaveStatusEdit = async (stId: string) => {
    if (!editStatusName.trim()) return;
    try {
      setIsSavingStatusEdit(true);
      await api.patch(`/tasks/statuses/${stId}`, {
        name: editStatusName.trim(),
        color: editStatusColor,
      });
      setStatuses((prev) =>
        prev.map((s) => (s.id === stId ? { ...s, name: editStatusName.trim(), color: editStatusColor } : s)),
      );
      setEditingStatusId(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar status');
    } finally {
      setIsSavingStatusEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <Clock className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando configurações...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
          Configurações do Sistema
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerencie seu perfil, segurança, parâmetros da organização, membros e pipelines operacionais.
        </p>
      </div>

      {/* Tabs com Scroll Horizontal Responsivo */}
      <div className="flex border-b border-border gap-2 sm:gap-4 text-sm font-medium overflow-x-auto no-scrollbar">
        <button
          onClick={() => setTabAndQuery('profile')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'profile'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="h-4 w-4" /> Meu Perfil & Senha
        </button>

        <button
          onClick={() => setTabAndQuery('general')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'general'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building className="h-4 w-4" /> Dados da Empresa
        </button>

        <button
          onClick={() => setTabAndQuery('organizations')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'organizations'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building2 className="h-4 w-4" /> Minhas Empresas ({memberships.length})
        </button>

        <button
          onClick={() => setTabAndQuery('members')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'members'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" /> Equipe & Convites
        </button>

        <button
          onClick={() => setTabAndQuery('roles')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'roles'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="h-4 w-4" /> Papéis e RBAC
        </button>

        <button
          onClick={() => setTabAndQuery('kanban')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
            tab === 'kanban'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Columns3 className="h-4 w-4" /> Colunas do Kanban
        </button>

        {user?.isSuperAdmin && (
          <button
            onClick={() => setTabAndQuery('superadmin')}
            className={`pb-2.5 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors cursor-pointer ${
              tab === 'superadmin'
                ? 'border-purple-500 text-purple-400 font-bold'
                : 'border-transparent text-muted-foreground hover:text-purple-400'
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-purple-400" /> SuperAdmin SaaS
          </button>
        )}
      </div>

      {/* TAB 1: MEU PERFIL & SENHA */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Dados Pessoais */}
          <form
            onSubmit={handleSaveProfile}
            className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Informações do Perfil</h3>
                <p className="text-xs text-muted-foreground">Atualize seu nome de exibição e preferências.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">E-mail Cadastrado</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-secondary/30 border border-border/80 rounded-xl px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
              />
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                O e-mail é utilizado como identificador exclusivo de login.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Fuso Horário Pessoal</label>
              <select
                value={userTimezone}
                onChange={(e) => setUserTimezone(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                <option value="America/Manaus">Manaus (GMT-4)</option>
                <option value="America/Belem">Belém (GMT-3)</option>
                <option value="America/Fortaleza">Fortaleza (GMT-3)</option>
                <option value="UTC">UTC Universal</option>
                <option value="America/New_York">Nova York (EST)</option>
                <option value="Europe/Lisbon">Lisboa (WET)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {profileSaving ? 'Salvando...' : 'Salvar Perfil'}
              </button>

              {profileSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold animate-in fade-in">
                  <Check className="h-4 w-4" /> Perfil atualizado!
                </span>
              )}
            </div>
          </form>

          {/* Alterar Senha */}
          <form
            onSubmit={handleChangePassword}
            className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Segurança & Senha</h3>
                <p className="text-xs text-muted-foreground">Altere sua senha de acesso periodicamente.</p>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                <span>Senha atualizada com sucesso! Outras sessões foram revogadas.</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1">Senha Atual *</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Nova Senha *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Confirmar Nova Senha *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordSaving}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground border border-border hover:border-primary/50 transition-all cursor-pointer disabled:opacity-50"
              >
                {passwordSaving ? 'Atualizando...' : 'Atualizar Senha'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: EMPRESA */}
      {tab === 'general' && (
        <div className="max-w-xl space-y-6">
          <form
            onSubmit={handleSaveOrg}
            className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5"
          >
            <div className="flex items-center gap-2.5 pb-2 border-b border-border">
              <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                <Building className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Identidade da Organização</h3>
                <p className="text-xs text-muted-foreground">Configurações globais do tenant ativo.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Nome da Organização *</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Fuso Horário Padrão</label>
              <input
                type="text"
                value={orgTimezone}
                onChange={(e) => setOrgTimezone(e.target.value)}
                placeholder="Ex.: America/Sao_Paulo"
                className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-[11px] text-muted-foreground mt-0.5 block">
                Define o fuso utilizado para prazos de projetos e entregas das tarefas.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                disabled={orgSaving}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {orgSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              {orgSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-semibold">
                  <Check className="h-4 w-4" /> Empresa atualizada!
                </span>
              )}
            </div>
          </form>

          {/* Informações Técnicas do Tenant */}
          <div className="p-5 rounded-2xl bg-secondary/20 border border-border space-y-2 text-xs">
            <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              Metadados do Tenant
            </span>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">ID do Workspace:</span>
              <span className="font-mono text-foreground">{activeOrg?.organizationId || '—'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Seu Papel Atual:</span>
              <span className="font-semibold text-primary">{activeOrg?.roleName || '—'}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB: MINHAS EMPRESAS (MULTI-TENANT) */}
      {tab === 'organizations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border rounded-2xl p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">Gestão de Empresas & Workspaces</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                O LoboFlow é nativamente multiempresa. Crie novos workspaces com pipelines, tarefas e equipes isoladas.
              </p>
            </div>
            <button
              onClick={() => {
                setShowCreateOrgModal(true);
                setOrgCreateError(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md transition-all cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" /> Nova Empresa
            </button>
          </div>

          {/* Modal / Formulário de Criação de Empresa */}
          {showCreateOrgModal && (
            <div className="bg-card border-2 border-primary/40 rounded-2xl p-6 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold">
                    <Plus className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Cadastrar Nova Empresa</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Uma nova organização será provisionada com permissões, cargos e pipelines iniciais.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateOrgModal(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 rotate-45" />
                </button>
              </div>

              {orgCreateError && (
                <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{orgCreateError}</span>
                </div>
              )}

              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nome da Empresa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex.: LoboAds Performance, Filial SP, Cliente XPTO"
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Fuso Horário Padrão</label>
                    <input
                      type="text"
                      value={newOrgTimezone}
                      onChange={(e) => setNewOrgTimezone(e.target.value)}
                      placeholder="America/Sao_Paulo"
                      className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateOrgModal(false)}
                    className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingOrg}
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {creatingOrg ? 'Criando Empresa...' : 'Criar e Acessar Empresa'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de Empresas Disponíveis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberships.map((m) => {
              const isActive = m.organizationId === activeOrg?.organizationId;
              return (
                <div
                  key={m.organizationId}
                  className={`p-5 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-primary/5 border-primary shadow-xs'
                      : 'bg-card border-border hover:border-border/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm uppercase ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-secondary text-foreground'
                        }`}
                      >
                        {m.organizationName?.[0] || 'E'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground">{m.organizationName}</h4>
                          {isActive && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                              Ativa
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          slug: {m.organizationSlug}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Papel:</span>
                      <span className="font-semibold text-foreground px-2 py-0.5 rounded-md bg-secondary">
                        {m.roleName}
                      </span>
                      {m.isOwner && (
                        <span className="text-[10px] text-amber-500 font-semibold">
                          (Dono)
                        </span>
                      )}
                    </div>

                    {isActive ? (
                      <span className="text-xs font-semibold text-primary flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" /> Workspace Atual
                      </span>
                    ) : (
                      <button
                        onClick={() => switchOrganization(m.organizationId)}
                        className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground text-xs font-semibold transition-all cursor-pointer"
                      >
                        Alternar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: MEMBROS & CONVITES */}
      {tab === 'members' && (
        <div className="space-y-6">
          <form onSubmit={handleInvite} className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" /> Convidar Novo Colaborador
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="email"
                  required
                  placeholder="E-mail do colaborador (ex.: designer@agencia.com)"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={inviting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer disabled:opacity-50"
            >
              {inviting ? 'Gerando convite...' : 'Enviar Convite'}
            </button>

            {inviteResult && (
              <div className="p-3 rounded-xl bg-secondary/60 text-xs text-foreground font-mono break-all border border-border">
                {inviteResult}
              </div>
            )}
          </form>

          {/* Lista de Membros */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border font-bold text-sm flex justify-between items-center">
              <span>Membros Ativos ({members.length})</span>
            </div>
            <div className="divide-y divide-border/60">
              {members.map((m) => (
                <div key={m.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
                      {m.user?.name?.[0] || 'U'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{m.user?.name}</div>
                      <div className="text-xs text-muted-foreground">{m.user?.email}</div>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-secondary text-foreground">
                    {m.role?.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PAPÉIS E RBAC */}
      {tab === 'roles' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-border font-bold text-sm">
            Papéis e Estrutura de Permissões RBAC
          </div>
          <div className="divide-y divide-border/60">
            {roles.map((r) => (
              <div key={r.id} className="p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-foreground">{r.name}</span>
                  {r.isOwner && (
                    <span className="text-[10px] bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full uppercase">
                      Proprietário
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{r.description || 'Sem descrição'}</p>
                <div className="text-[11px] text-muted-foreground pt-1">
                  {r.permissions?.length || 0} permissões ativas vinculadas.
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: COLUNAS DO KANBAN */}
      {tab === 'kanban' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateStatus}
            className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4 max-w-xl"
          >
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Adicionar Nova Coluna ao Pipeline
            </h3>
            <p className="text-xs text-muted-foreground">
              Crie etapas personalizadas para o fluxo de tarefas da sua equipe (ex.: Revisão, Copywriting, etc.).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  placeholder="Nome da etapa (ex.: Copywriting)"
                  value={newStatusName}
                  onChange={(e) => setNewStatusName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  className="h-9 w-12 rounded-lg bg-transparent cursor-pointer border border-border"
                />
                <button
                  type="submit"
                  disabled={statusSaving}
                  className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {statusSaving ? 'Criando...' : 'Adicionar'}
                </button>
              </div>
            </div>
          </form>

          {/* Lista de Colunas Atuais */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs max-w-2xl">
            <div className="p-4 border-b border-border font-bold text-sm">
              Colunas Ativas do Kanban ({statuses.length})
            </div>
            <div className="divide-y divide-border/60">
              {statuses.map((st, idx) => {
                const isEditingThis = editingStatusId === st.id;

                if (isEditingThis) {
                  return (
                    <div key={st.id} className="p-4 bg-secondary/50 space-y-2.5 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editStatusName}
                          onChange={(e) => setEditStatusName(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Nome da etapa..."
                        />
                        <input
                          type="color"
                          value={editStatusColor}
                          onChange={(e) => setEditStatusColor(e.target.value)}
                          className="h-8 w-10 rounded-lg cursor-pointer border border-border bg-transparent p-0 shrink-0"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingStatusId(null)}
                          className="px-3 py-1 rounded-lg text-xs bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isSavingStatusEdit || !editStatusName.trim()}
                          onClick={() => handleSaveStatusEdit(st.id)}
                          className="px-4 py-1 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer disabled:opacity-50"
                        >
                          {isSavingStatusEdit ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={st.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground font-mono w-5">#{idx + 1}</span>
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: st.color || '#3b82f6' }}
                      />
                      <div>
                        <span className="font-semibold text-sm text-foreground">{st.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({st._count?.tasks || 0} tarefas ativas)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEditStatus(st)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                        title="Editar nome e cor da coluna"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {st._count?.tasks === 0 && (
                        <button
                          onClick={() => handleDeleteStatus(st.id, st.name)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir coluna vazia"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SUPERADMIN SAAS */}
      {tab === 'superadmin' && user?.isSuperAdmin && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Console SuperAdmin SaaS</h3>
                <p className="text-xs text-muted-foreground">
                  Painel de governança multi-empresa, tenants, cobranças e telemetria global.
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Como SuperAdmin do LoboFlow, você possui controle irrestrito sobre todas as organizações cadastradas,
              logs de auditoria da infraestrutura, criação de novos clientes institucionais e feature flags.
            </p>

            <div className="pt-2">
              <Link
                to="/superadmin"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm shadow-md transition-all cursor-pointer"
              >
                Acessar Painel SuperAdmin Completo <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
