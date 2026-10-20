import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import {
  Settings,
  Users,
  Shield,
  Clock,
  Mail,
  UserPlus,
  Check,
  Building,
} from 'lucide-react';

export function SettingsPage() {
  const { activeOrg } = useAuth();
  const [tab, setTab] = useState<'general' | 'members' | 'roles'>('general');
  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Geral
  const [orgName, setOrgName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form Convite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orgRes, membersRes, rolesRes]: [any, any, any] = await Promise.all([
        api.get('/organizations/current'),
        api.get('/organizations/current/members'),
        api.get('/organizations/current/roles'),
      ]);
      setOrg(orgRes);
      setOrgName(orgRes.name);
      setTimezone(orgRes.timezone);
      setMembers(membersRes || []);
      setRoles(rolesRes || []);
      if (rolesRes?.length > 0 && !inviteRoleId) {
        setInviteRoleId(rolesRes[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg?.organizationId]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/organizations/current', {
        name: orgName,
        timezone,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar alterações');
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteRoleId) return;

    try {
      const res: any = await api.post('/organizations/current/invitations', {
        email: inviteEmail,
        roleId: inviteRoleId,
      });
      setInviteResult(`Convite gerado! Token de acesso: ${res.inviteToken}`);
      setInviteEmail('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao convidar');
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
          Configurações da Organização
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gerenciamento da empresa, membros da equipe, papéis e permissões RBAC.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-4 text-sm font-medium">
        <button
          onClick={() => setTab('general')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            tab === 'general'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Building className="h-4 w-4" /> Dados da Empresa
        </button>

        <button
          onClick={() => setTab('members')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            tab === 'members'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" /> Membros e Convites
        </button>

        <button
          onClick={() => setTab('roles')}
          className={`pb-2.5 border-b-2 flex items-center gap-2 transition-colors ${
            tab === 'roles'
              ? 'border-primary text-primary font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shield className="h-4 w-4" /> Papéis e Permissões
        </button>
      </div>

      {/* Tab Geral */}
      {tab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5 max-w-xl">
          <div>
            <label className="block text-xs font-semibold mb-1">Nome da Organização</label>
            <input
              type="text"
              required
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Fuso Horário Padrão</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-[11px] text-muted-foreground">Ex.: America/Sao_Paulo</span>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
            >
              Salvar Alterações
            </button>
            {savedSuccess && (
              <span className="text-xs text-emerald-500 flex items-center gap-1 font-semibold">
                <Check className="h-4 w-4" /> Atualizado com sucesso!
              </span>
            )}
          </div>
        </form>
      )}

      {/* Tab Membros */}
      {tab === 'members' && (
        <div className="space-y-6">
          {/* Convidar */}
          <form onSubmit={handleInvite} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
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
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <select
                  value={inviteRoleId}
                  onChange={(e) => setInviteRoleId(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
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
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
            >
              Enviar Convite
            </button>

            {inviteResult && (
              <div className="p-3 rounded-lg bg-secondary/60 text-xs text-foreground font-mono break-all border border-border">
                {inviteResult}
              </div>
            )}
          </form>

          {/* Lista de Membros */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border font-bold text-sm">
              Membros Ativos ({members.length})
            </div>
            <div className="divide-y divide-border/60">
              {members.map((m) => (
                <div key={m.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
                      {m.user?.name?.[0]}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{m.user?.name}</div>
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

      {/* Tab Papéis */}
      {tab === 'roles' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border font-bold text-sm">
            Papéis e Estrutura de Permissões RBAC
          </div>
          <div className="divide-y divide-border/60">
            {roles.map((r) => (
              <div key={r.id} className="p-4 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm">{r.name}</span>
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
    </div>
  );
}
