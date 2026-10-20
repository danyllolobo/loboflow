import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  ShieldAlert,
  Building2,
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  History,
} from 'lucide-react';

export function SuperAdminPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Suspensão Modal
  const [suspendModalOrg, setSuspendModalOrg] = useState<any | null>(null);
  const [reason, setReason] = useState('');
  const [confirmName, setConfirmName] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, orgs, logs] = await Promise.all([
        api.get('/superadmin/metrics'),
        api.get('/superadmin/organizations'),
        api.get('/superadmin/audit-logs'),
      ]);
      setMetrics(m);
      setOrganizations((orgs as any[]) || []);
      setAuditLogs((logs as any[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suspendModalOrg) return;

    try {
      await api.post(`/superadmin/organizations/${suspendModalOrg.id}/suspend`, {
        reason,
        confirm: confirmName,
      });
      setSuspendModalOrg(null);
      setReason('');
      setConfirmName('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao suspender organização');
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await api.post(`/superadmin/organizations/${id}/activate`);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <Clock className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando painel SuperAdmin...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
              SuperAdmin Global
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Área restrita de governança global da plataforma LoboFlow.
          </p>
        </div>
      </div>

      {/* Indicadores Globais */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <span className="text-xs text-muted-foreground font-semibold">Total de Organizações</span>
            <div className="text-2xl font-bold font-display mt-1">{metrics.totalOrganizations}</div>
            <div className="text-[11px] text-emerald-500 mt-1">{metrics.activeOrganizations} ativas</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <span className="text-xs text-muted-foreground font-semibold">Total de Usuários</span>
            <div className="text-2xl font-bold font-display mt-1">{metrics.totalUsers}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Cadastrados na plataforma</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <span className="text-xs text-muted-foreground font-semibold">Total de Tarefas</span>
            <div className="text-2xl font-bold font-display mt-1">{metrics.totalTasks}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Em todas as empresas</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <span className="text-xs text-muted-foreground font-semibold">Consumo IA (Jarvis)</span>
            <div className="text-2xl font-bold font-display mt-1 text-sky-400">
              {metrics.ai?.totalTokens || 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">{metrics.ai?.totalCalls || 0} chamadas de ferramentas</div>
          </div>
        </div>
      )}

      {/* Tabela de Organizações */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border font-bold text-sm flex items-center justify-between">
          <span>Organizações Cadastradas</span>
          <span className="text-xs text-muted-foreground">{organizations.length} total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase border-b border-border">
              <tr>
                <th className="py-3 px-4">Empresa</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Membros</th>
                <th className="py-3 px-4">Tarefas</th>
                <th className="py-3 px-4">Criada em</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-secondary/20">
                  <td className="py-3 px-4 font-semibold text-foreground">
                    {org.name}
                    <div className="text-xs font-mono text-muted-foreground">{org.slug}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        org.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}
                    >
                      {org.status === 'ACTIVE' ? 'Ativa' : 'Suspensa'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs">{org._count?.memberships || 0}</td>
                  <td className="py-3 px-4 text-xs">{org._count?.tasks || 0}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {new Date(org.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {org.status === 'ACTIVE' ? (
                      <button
                        onClick={() => setSuspendModalOrg(org)}
                        className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20"
                      >
                        Suspender
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(org.id)}
                        className="text-xs text-emerald-500 hover:text-emerald-600 font-semibold px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20"
                      >
                        Reativar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trilha de Auditoria Recente */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border font-bold text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Trilha de Auditoria Recente
        </div>

        <div className="divide-y divide-border/60 max-h-80 overflow-y-auto">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-3.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5 truncate">
                <span className="font-mono font-bold text-primary mr-2">[{log.action}]</span>
                <span className="text-muted-foreground truncate">{JSON.stringify(log.metadata || {})}</span>
              </div>
              <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-4">
                {new Date(log.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Suspensão com Confirmação Obrigatória */}
      {suspendModalOrg && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
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
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo formal da suspensão..."
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Digite <strong className="text-foreground">"{suspendModalOrg.name}"</strong> para confirmar:
                </label>
                <input
                  type="text"
                  required
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSuspendModalOrg(null)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-secondary hover:bg-secondary/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={confirmName.trim() !== suspendModalOrg.name.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-500 hover:bg-rose-600 text-white disabled:opacity-40"
                >
                  Confirmar Suspensão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
