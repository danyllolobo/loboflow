import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api';
import {
  DollarSign,
  Calendar,
  Clock,
  Plus,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  FileText,
  X,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Trash2,
  Edit3,
  Info,
  CalendarClock,
  Percent,
} from 'lucide-react';
import {
  CONTRACT_END_REASONS,
  RENEWAL_STATUSES,
  RETURN_INTENTIONS,
} from '@loboflow/shared';

interface ContractItem {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    segment?: string | null;
    status: 'LEAD' | 'ACTIVE' | 'PAUSED' | 'CHURNED';
  };
  service: string;
  startDate: string;
  endDate?: string | null;
  monthlyValueCents?: number | null;
  renewalStatus: 'PENDING' | 'RENEWED' | 'NOT_RENEWING' | 'NOT_APPLICABLE';
  status: 'ACTIVE' | 'ENDED';
  notes?: string | null;
  endedAt?: string | null;
  endedById?: string | null;
  endReasonCode?: string | null;
  endReasonDetail?: string | null;
  wantsToReturn?: 'YES' | 'MAYBE' | 'NO' | null;
  futureContactAt?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContractMetrics {
  activeContractsCount: number;
  totalMonthlyValueCents: number;
  annualRunRateCents: number;
  avgTicketMonthlyCents: number;
  pendingRenewalsCount: number;
  endedContractsCount: number;
  churnReasonsBreakdown: Record<string, number>;
}

function formatBrl(cents?: number | null) {
  if (!cents && cents !== 0) return 'R$ 0,00';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  // Parse date safely handling UTC dates
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function ContractsView({ onOpenNewContractTrigger }: { onOpenNewContractTrigger?: boolean }) {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [metrics, setMetrics] = useState<ContractMetrics>({
    activeContractsCount: 0,
    totalMonthlyValueCents: 0,
    annualRunRateCents: 0,
    avgTicketMonthlyCents: 0,
    pendingRenewalsCount: 0,
    endedContractsCount: 0,
    churnReasonsBreakdown: {},
  });
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ENDED'>('ALL');
  const [renewalFilter, setRenewalFilter] = useState<string>('ALL');

  // Modal Novo / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractItem | null>(null);
  const [clientId, setClientId] = useState('');
  const [service, setService] = useState('');
  const [monthlyValue, setMonthlyValue] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [renewalStatus, setRenewalStatus] = useState<'PENDING' | 'RENEWED' | 'NOT_RENEWING' | 'NOT_APPLICABLE'>('PENDING');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Encerramento Auditado (Churn)
  const [endContractModalOpen, setEndContractModalOpen] = useState(false);
  const [contractToEnd, setContractToEnd] = useState<ContractItem | null>(null);
  const [endedAt, setEndedAt] = useState(new Date().toISOString().split('T')[0]);
  const [endReasonCode, setEndReasonCode] = useState<string>('RESULTS');
  const [endReasonDetail, setEndReasonDetail] = useState('');
  const [wantsToReturn, setWantsToReturn] = useState<'YES' | 'MAYBE' | 'NO'>('MAYBE');
  const [futureContactAt, setFutureContactAt] = useState('');
  const [markClientChurned, setMarkClientChurned] = useState(true);
  const [isEnding, setIsEnding] = useState(false);

  // Modal Detalhes do Encerramento
  const [auditDetailContract, setAuditDetailContract] = useState<ContractItem | null>(null);

  // Modal Renovação Rápida
  const [renewModalOpen, setRenewModalOpen] = useState(false);
  const [contractToRenew, setContractToRenew] = useState<ContractItem | null>(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [isRenewing, setIsRenewing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contractsRes, metricsRes, clientsRes] = await Promise.all([
        api.get<ContractItem[]>('/contracts'),
        api.get<ContractMetrics>('/contracts/metrics'),
        api.get<any[]>('/clients'),
      ]);

      setContracts(Array.isArray(contractsRes) ? contractsRes : []);
      if (metricsRes) setMetrics(metricsRes);
      setClients(Array.isArray(clientsRes) ? clientsRes : []);
    } catch (err) {
      console.error('Falha ao carregar contratos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (onOpenNewContractTrigger) {
      openCreateModal();
    }
  }, [onOpenNewContractTrigger]);

  const openCreateModal = () => {
    setEditingContract(null);
    setClientId(clients[0]?.id || '');
    setService('');
    setMonthlyValue('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('');
    setRenewalStatus('PENDING');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (c: ContractItem) => {
    setEditingContract(c);
    setClientId(c.clientId);
    setService(c.service);
    setMonthlyValue(c.monthlyValueCents ? (c.monthlyValueCents / 100).toString() : '');
    setStartDate(c.startDate ? (c.startDate.split('T')[0] || '') : '');
    setEndDate(c.endDate ? (c.endDate.split('T')[0] || '') : '');
    setRenewalStatus(c.renewalStatus);
    setNotes(c.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEndModal = (c: ContractItem) => {
    setContractToEnd(c);
    setEndedAt(new Date().toISOString().split('T')[0] || '');
    setEndReasonCode('RESULTS');
    setEndReasonDetail('');
    setWantsToReturn('MAYBE');
    setFutureContactAt('');
    setMarkClientChurned(true);
    setEndContractModalOpen(true);
  };

  const openRenewModal = (c: ContractItem) => {
    setContractToRenew(c);
    // Sugere prorrogação de 1 ano
    const defaultNext = new Date();
    defaultNext.setFullYear(defaultNext.getFullYear() + 1);
    setNewEndDate(defaultNext.toISOString().split('T')[0] || '');
    setRenewModalOpen(true);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service.trim()) {
      setFormError('Informe o nome do serviço.');
      return;
    }
    if (!startDate) {
      setFormError('Informe a data de início do contrato.');
      return;
    }

    const valueCents = monthlyValue ? Math.round(parseFloat(monthlyValue.replace(',', '.')) * 100) : null;

    try {
      setIsSaving(true);
      setFormError(null);

      if (editingContract) {
        await api.patch(`/contracts/${editingContract.id}`, {
          service: service.trim(),
          startDate,
          endDate: endDate || null,
          monthlyValueCents: valueCents,
          renewalStatus,
          notes: notes.trim() || null,
        });
      } else {
        if (!clientId) {
          setFormError('Selecione um cliente.');
          return;
        }
        await api.post('/contracts', {
          clientId,
          service: service.trim(),
          startDate,
          endDate: endDate || null,
          monthlyValueCents: valueCents,
          renewalStatus,
          notes: notes.trim() || null,
        });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar contrato.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEndContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractToEnd) return;

    try {
      setIsEnding(true);
      await api.post(`/contracts/${contractToEnd.id}/end`, {
        endedAt,
        endReasonCode,
        endReasonDetail: endReasonDetail.trim() || null,
        wantsToReturn,
        futureContactAt: futureContactAt || null,
        markClientChurned,
      });

      setEndContractModalOpen(false);
      setContractToEnd(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao encerrar contrato.');
    } finally {
      setIsEnding(false);
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractToRenew) return;

    try {
      setIsRenewing(true);
      await api.post(`/contracts/${contractToRenew.id}/renew`, {
        newEndDate: newEndDate || undefined,
      });

      setRenewModalOpen(false);
      setContractToRenew(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao renovar contrato.');
    } finally {
      setIsRenewing(false);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este contrato?')) return;
    try {
      await api.delete(`/contracts/${id}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir contrato.');
    }
  };

  // Filtragem
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (renewalFilter !== 'ALL' && c.renewalStatus !== renewalFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesClient = c.client.name.toLowerCase().includes(q);
        const matchesService = c.service.toLowerCase().includes(q);
        const matchesSegment = c.client.segment?.toLowerCase().includes(q);
        if (!matchesClient && !matchesService && !matchesSegment) return false;
      }
      return true;
    });
  }, [contracts, statusFilter, renewalFilter, search]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* KPI Cards — Double-Bezel Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR Card */}
        <div className="p-1 rounded-3xl bg-border/40">
          <div className="p-5 rounded-[calc(1.5rem-4px)] bg-card border border-border/50 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                MRR (Receita Recorrente)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-foreground">
                  {formatBrl(metrics.totalMonthlyValueCents)}
                </span>
                <span className="text-xs text-muted-foreground font-medium">/mês</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <ArrowUpRight className="w-3 h-3" />
                  ARR: {formatBrl(metrics.annualRunRateCents)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Contratos Ativos */}
        <div className="p-1 rounded-3xl bg-primary/10 dark:bg-primary/5">
          <div className="p-5 rounded-[calc(1.5rem-4px)] bg-card border border-primary/20 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Contratos Ativos
              </span>
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-foreground">
                {metrics.activeContractsCount}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Clientes gerando receita ativa
              </p>
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="p-1 rounded-3xl bg-border/40">
          <div className="p-5 rounded-[calc(1.5rem-4px)] bg-card border border-border/50 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ticket Médio Mensal
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-foreground">
                {formatBrl(metrics.avgTicketMonthlyCents)}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Por contrato em vigência</p>
            </div>
          </div>
        </div>

        {/* Renovações Pendentes & Churn */}
        <div className="p-1 rounded-3xl bg-border/40">
          <div className="p-5 rounded-[calc(1.5rem-4px)] bg-card border border-border/50 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Renovações & Churn
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <CalendarClock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className="text-2xl font-black text-amber-500">
                  {metrics.pendingRenewalsCount}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">Renovação pendente</p>
              </div>
              <div className="border-l border-border/70 pl-4 text-right">
                <span className="text-xl font-bold text-muted-foreground">
                  {metrics.endedContractsCount}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">Contratos encerrados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card border border-border rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por cliente, serviço ou nicho..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro de Status */}
          <div className="flex items-center bg-secondary/60 p-1 rounded-xl border border-border text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos ({contracts.length})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-500/15 text-emerald-500 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Ativos ({metrics.activeContractsCount})
            </button>
            <button
              onClick={() => setStatusFilter('ENDED')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === 'ENDED'
                  ? 'bg-rose-500/15 text-rose-400 font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Encerrados ({metrics.endedContractsCount})
            </button>
          </div>

          {/* Filtro de Renovação */}
          <select
            value={renewalFilter}
            onChange={(e) => setRenewalFilter(e.target.value)}
            className="bg-secondary/60 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
          >
            <option value="ALL">Todas Renovações</option>
            <option value="PENDING">Pendente</option>
            <option value="RENEWED">Renovado</option>
            <option value="NOT_RENEWING">Não Renova</option>
            <option value="NOT_APPLICABLE">Não Aplicável</option>
          </select>

          {/* Botão Novo Contrato */}
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Contrato</span>
          </button>
        </div>
      </div>

      {/* Lista de Contratos */}
      {loading ? (
        <div className="py-20 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span>Carregando contratos e métricas financeiras...</span>
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className="py-16 text-center bg-card border border-dashed border-border rounded-2xl flex flex-col items-center justify-center p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-foreground">Nenhum contrato encontrado</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            {search || statusFilter !== 'ALL' || renewalFilter !== 'ALL'
              ? 'Tente ajustar os filtros ou termos da busca para encontrar o contrato desejado.'
              : 'Cadastre o primeiro contrato de prestação de serviços para gerenciar o faturamento e retenção da sua agência.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeiro Contrato
          </button>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 border-b border-border/80 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Serviço</th>
                  <th className="py-3.5 px-4">Valor Mensal (MRR)</th>
                  <th className="py-3.5 px-4">Vigência</th>
                  <th className="py-3.5 px-4">Status & Renovação</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredContracts.map((c) => {
                  const isActive = c.status === 'ACTIVE';
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-secondary/30 transition-colors ${
                        !isActive ? 'opacity-75 bg-secondary/10' : ''
                      }`}
                    >
                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                              isActive
                                ? 'bg-primary/10 text-primary'
                                : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {c.client.name.substring(0, 2)}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block text-xs">
                              {c.client.name}
                            </span>
                            {c.client.segment && (
                              <span className="text-[10px] text-muted-foreground block">
                                {c.client.segment}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Serviço */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-foreground block">
                          {c.service}
                        </span>
                        {c.notes && (
                          <span className="text-[11px] text-muted-foreground truncate block max-w-xs">
                            {c.notes}
                          </span>
                        )}
                      </td>

                      {/* Valor Mensal */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-sm text-foreground">
                          {formatBrl(c.monthlyValueCents)}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          mensal recorrente
                        </span>
                      </td>

                      {/* Vigência */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Início: {formatDate(c.startDate)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {c.endDate ? `Término: ${formatDate(c.endDate)}` : 'Indeterminado / Recorrente'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status & Renovação */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Contrato Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3 h-3" />
                              Encerrado ({formatDate(c.endedAt)})
                            </span>
                          )}

                          {isActive && (
                            <div>
                              {c.renewalStatus === 'PENDING' && (
                                <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block">
                                  Renovação Pendente
                                </span>
                              )}
                              {c.renewalStatus === 'RENEWED' && (
                                <span className="text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md inline-block">
                                  Renovado
                                </span>
                              )}
                              {c.renewalStatus === 'NOT_RENEWING' && (
                                <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md inline-block">
                                  Não Renova
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isActive ? (
                            <>
                              <button
                                onClick={() => openRenewModal(c)}
                                title="Renovar Contrato"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditModal(c)}
                                title="Editar Contrato"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEndModal(c)}
                                title="Encerrar Contrato (Churn Auditado)"
                                className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition-colors cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setAuditDetailContract(c)}
                                title="Ver Auditoria do Churn"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                              >
                                <Info className="w-3 h-3 text-primary" />
                                <span>Ver Motivo</span>
                              </button>
                              <button
                                onClick={() => handleDeleteContract(c.id)}
                                title="Excluir Contrato"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CRIAR OU EDITAR CONTRATO                                         */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {editingContract ? 'Editar Contrato' : 'Novo Contrato de Prestação'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Registre a recorrência e termos acordados com o cliente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveContract} className="space-y-4">
              {/* Cliente (Somente ao criar) */}
              {!editingContract && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Cliente *</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="" disabled>Selecione o cliente...</option>
                    {clients.map((cli) => (
                      <option key={cli.id} value={cli.id}>
                        {cli.name} {cli.segment ? `(${cli.segment})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Serviço */}
              <div>
                <label className="block text-xs font-semibold mb-1">Serviço Contratado *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Gestão de Tráfego Pago, Social Media, Assessoria de Conteúdo"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Valor Mensal */}
              <div>
                <label className="block text-xs font-semibold mb-1">Valor Mensal (R$)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="3500.00"
                    value={monthlyValue}
                    onChange={(e) => setMonthlyValue(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Define o MRR (Receita Recorrente Mensal) gerado por este cliente.
                </span>
              </div>

              {/* Datas de Vigência */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Data de Término (Opcional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Deixe em branco para contrato sem prazo fixo.
                  </span>
                </div>
              </div>

              {/* Status de Renovação */}
              <div>
                <label className="block text-xs font-semibold mb-1">Status de Renovação</label>
                <select
                  value={renewalStatus}
                  onChange={(e) => setRenewalStatus(e.target.value as any)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  <option value="PENDING">Pendente (Aguardando período)</option>
                  <option value="RENEWED">Renovado</option>
                  <option value="NOT_RENEWING">Não Renova</option>
                  <option value="NOT_APPLICABLE">Não Aplicável</option>
                </select>
              </div>

              {/* Notas Adicionais */}
              <div>
                <label className="block text-xs font-semibold mb-1">Notas / Observações</label>
                <textarea
                  rows={2}
                  placeholder="Condições especiais, bônus, termos de rescisão..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : editingContract ? 'Salvar Alterações' : 'Criar Contrato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ENCERRAMENTO AUDITADO (OFFBOARDING / CHURN)                      */}
      {/* ========================================================================= */}
      {endContractModalOpen && contractToEnd && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEndContractModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-card border-2 border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Encerramento Auditado de Contrato
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Cliente: <strong className="text-foreground">{contractToEnd.client.name}</strong> ({contractToEnd.service})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEndContractModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Registro Estruturado de Churn
              </p>
              <p className="text-[11px] text-muted-foreground">
                Os dados de motivo e intenção de retorno serão salvos de forma auditada para alimentar os relatórios de retenção e auxiliar o comercial em reabordagens futuras.
              </p>
            </div>

            <form onSubmit={handleEndContractSubmit} className="space-y-4">
              {/* Data do Encerramento */}
              <div>
                <label className="block text-xs font-semibold mb-1">Data do Encerramento *</label>
                <input
                  type="date"
                  required
                  value={endedAt}
                  onChange={(e) => setEndedAt(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>

              {/* Motivo Estruturado */}
              <div>
                <label className="block text-xs font-semibold mb-1">Motivo Estruturado *</label>
                <select
                  value={endReasonCode}
                  onChange={(e) => setEndReasonCode(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                >
                  {Object.entries(CONTRACT_END_REASONS).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Detalhes do Motivo */}
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Detalhamento do Motivo / Feedback do Cliente
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva o que motivou a saída, o que foi conversado e possíveis aprendizados para a equipe..."
                  value={endReasonDetail}
                  onChange={(e) => setEndReasonDetail(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Intenção de Retorno & Reabordagem */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Intenção de Retorno *</label>
                  <select
                    value={wantsToReturn}
                    onChange={(e) => setWantsToReturn(e.target.value as any)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  >
                    <option value="YES">Sim, tem interesse</option>
                    <option value="MAYBE">Talvez, momento oportuno</option>
                    <option value="NO">Não pretende retornar</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Data para Reabordagem</label>
                  <input
                    type="date"
                    value={futureContactAt}
                    onChange={(e) => setFutureContactAt(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                  />
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Opcional: agende quando ligar novamente.
                  </span>
                </div>
              </div>

              {/* Checkbox Churn do Cliente */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markClientChurned}
                  onChange={(e) => setMarkClientChurned(e.target.checked)}
                  className="rounded text-primary focus:ring-primary mt-0.5"
                />
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Atualizar status do cliente para "CHURNED"
                  </span>
                  <span className="text-[11px] text-muted-foreground block">
                    Se este for o único contrato ativo, marca o cliente como churned na carteira.
                  </span>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEndContractModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEnding}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isEnding ? 'Encerrando...' : 'Confirmar Encerramento Auditado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: AUDITORIA DO ENCERRAMENTO (VER MOTIVO)                          */}
      {/* ========================================================================= */}
      {auditDetailContract && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setAuditDetailContract(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  Auditoria de Encerramento (Churn)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAuditDetailContract(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-secondary/50 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Cliente & Serviço
                </span>
                <p className="font-bold text-foreground text-sm">
                  {auditDetailContract.client.name}
                </p>
                <p className="text-muted-foreground">{auditDetailContract.service}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Data Encerramento
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatDate(auditDetailContract.endedAt)}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                    Intenção de Retorno
                  </span>
                  <span className="font-semibold text-foreground">
                    {auditDetailContract.wantsToReturn === 'YES'
                      ? 'Sim, pretende voltar'
                      : auditDetailContract.wantsToReturn === 'MAYBE'
                      ? 'Talvez'
                      : 'Não pretende voltar'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-border/60 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Motivo Estruturado
                </span>
                <span className="font-bold text-rose-400 block">
                  {CONTRACT_END_REASONS[auditDetailContract.endReasonCode as keyof typeof CONTRACT_END_REASONS] ||
                    auditDetailContract.endReasonCode ||
                    'Não especificado'}
                </span>
                {auditDetailContract.endReasonDetail && (
                  <p className="text-muted-foreground text-[11px] pt-1 border-t border-border/40 mt-1">
                    "{auditDetailContract.endReasonDetail}"
                  </p>
                )}
              </div>

              {auditDetailContract.futureContactAt && (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                  <span className="text-muted-foreground">Reabordagem Agendada:</span>
                  <span className="font-bold text-primary">
                    {formatDate(auditDetailContract.futureContactAt)}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setAuditDetailContract(null)}
                className="w-full py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-all cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: RENOVAÇÃO RÁPIDA                                                 */}
      {/* ========================================================================= */}
      {renewModalOpen && contractToRenew && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setRenewModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-sky-400" />
                <h3 className="text-base font-bold text-foreground">Renovar Contrato</h3>
              </div>
              <button
                type="button"
                onClick={() => setRenewModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Renovando contrato de <strong>{contractToRenew.client.name}</strong> para o serviço{' '}
              <strong>{contractToRenew.service}</strong> ({formatBrl(contractToRenew.monthlyValueCents)}/mês).
            </p>

            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Nova Data de Término da Vigência
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                />
                <span className="text-[10px] text-muted-foreground block mt-0.5">
                  Deixe em branco se a renovação for por tempo indeterminado.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRenewModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isRenewing}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-sky-500 hover:bg-sky-600 text-white shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRenewing ? 'Renovando...' : 'Confirmar Renovação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
