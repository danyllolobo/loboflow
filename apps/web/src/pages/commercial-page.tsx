import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import {
  TrendingUp,
  Plus,
  Search,
  DollarSign,
  Calendar,
  Clock,
  User,
  ArrowRight,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Phone,
  Mail,
  Video,
  FileText,
  AlertTriangle,
  X,
  ChevronRight,
  Building,
  Target,
  Sparkles,
  PieChart,
  LucideIcon,
  Edit3,
} from 'lucide-react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  DEAL_LOST_REASONS,
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  DealStage,
} from '@loboflow/shared';

interface DealInteraction {
  id: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'MESSAGE' | 'NOTE';
  summary: string;
  occurredAt: string;
  authorId?: string;
}

interface DealItem {
  id: string;
  prospectName: string;
  clientId?: string | null;
  client?: { id: string; name: string; segment?: string | null } | null;
  segment?: string | null;
  source?: string | null;
  scope?: string | null;
  valueCents?: number | null;
  proposalDate?: string | null;
  ownerId?: string | null;
  owner?: { id: string; name: string; email: string } | null;
  stage: DealStage;
  nextContactAt?: string | null;
  notes?: string | null;
  wonReason?: string | null;
  lostReasonCode?: string | null;
  lostReasonDetail?: string | null;
  createdAt: string;
  updatedAt: string;
  interactions?: DealInteraction[];
  _count?: { interactions: number };
}

interface ClientOption {
  id: string;
  name: string;
}

interface MemberOption {
  id: string;
  user: { id: string; name: string; email: string };
}

const STAGE_ACCENT: Record<DealStage, { border: string; headerBg: string; badgeBg: string; text: string }> = {
  NEW: {
    border: 'border-sky-500/30',
    headerBg: 'bg-sky-500/10',
    badgeBg: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
    text: 'text-sky-500',
  },
  CONTACTED: {
    border: 'border-indigo-500/30',
    headerBg: 'bg-indigo-500/10',
    badgeBg: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
    text: 'text-indigo-500',
  },
  PROPOSAL: {
    border: 'border-amber-500/30',
    headerBg: 'bg-amber-500/10',
    badgeBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    text: 'text-amber-500',
  },
  NEGOTIATION: {
    border: 'border-purple-500/30',
    headerBg: 'bg-purple-500/10',
    badgeBg: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
    text: 'text-purple-500',
  },
  WON: {
    border: 'border-emerald-500/30',
    headerBg: 'bg-emerald-500/10',
    badgeBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-500',
  },
  LOST: {
    border: 'border-rose-500/30',
    headerBg: 'bg-rose-500/10',
    badgeBg: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
    text: 'text-rose-500',
  },
};

const INTERACTION_ICONS: Record<string, LucideIcon> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Video,
  MESSAGE: MessageSquare,
  NOTE: FileText,
};

function formatBrl(cents?: number | null) {
  if (!cents && cents !== 0) return 'R$ 0,00';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function DraggableDealCard({
  deal,
  onOpenDetail,
  onOpenEdit,
}: {
  deal: DealItem;
  onOpenDetail: (deal: DealItem) => void;
  onOpenEdit?: (deal: DealItem) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });

  const isOverdue =
    deal.nextContactAt &&
    new Date(deal.nextContactAt) < new Date(new Date().toDateString());

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpenDetail(deal)}
      className={`group p-1 rounded-2xl bg-border/40 hover:bg-border/80 transition-all duration-200 cursor-grab active:cursor-grabbing shadow-xs hover:shadow-md select-none ${
        isDragging
          ? 'opacity-30 border-dashed border-2 border-primary/50 scale-[0.98]'
          : ''
      }`}
    >
      <div className="p-4 rounded-[calc(1rem-4px)] bg-card border border-border/60 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {deal.prospectName}
          </h4>
          <div className="flex items-center gap-1.5 shrink-0">
            {deal.segment && (
              <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">
                {deal.segment}
              </span>
            )}
            {onOpenEdit && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEdit(deal);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                title="Editar oportunidade"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Valor BRL */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-foreground">
            {deal.valueCents ? formatBrl(deal.valueCents) : 'A definir'}
          </span>
          {deal._count && deal._count.interactions > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <MessageSquare className="w-3 h-3" />
              {deal._count.interactions}
            </span>
          )}
        </div>

        {/* Próximo Contato */}
        {deal.nextContactAt && (
          <div
            className={`flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg ${
              isOverdue
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'bg-muted/70 text-muted-foreground'
            }`}
          >
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {isOverdue ? 'Atrasado: ' : 'Retorno: '}
              {new Date(deal.nextContactAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        )}

        {/* Cliente / Responsável */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
          {deal.client ? (
            <span className="truncate flex items-center gap-1">
              <Building className="w-3 h-3 shrink-0" />
              {deal.client.name}
            </span>
          ) : (
            <span className="italic">Prospect</span>
          )}
          {deal.owner && <span className="truncate font-semibold">{deal.owner.name}</span>}
        </div>
      </div>
    </div>
  );
}

function DroppableDealColumn({
  stage,
  children,
}: {
  stage: DealStage;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-3 space-y-3 min-h-[320px] max-h-[70vh] overflow-y-auto transition-colors rounded-b-3xl ${
        isOver ? 'bg-primary/5 ring-2 ring-primary/40 ring-inset' : ''
      }`}
    >
      {children}
    </div>
  );
}

export function CommercialPage() {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeDealDetails, setActiveDealDetails] = useState<DealItem | null>(null);
  const [isSavingDeal, setIsSavingDeal] = useState(false);

  // DnD Active State
  const [activeDealId, setActiveDealId] = useState<string | null>(null);

  // Edição de Oportunidade
  const [isEditingDeal, setIsEditingDeal] = useState(false);
  const [editProspectName, setEditProspectName] = useState('');
  const [editValueText, setEditValueText] = useState('');
  const [editSegment, setEditSegment] = useState('');
  const [editScope, setEditScope] = useState('');
  const [editNextContact, setEditNextContact] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingDealEdit, setIsSavingDealEdit] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  // Form State Nova Oportunidade
  const [formProspectName, setFormProspectName] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formSegment, setFormSegment] = useState('');
  const [formSource, setFormSource] = useState('Indicação');
  const [formScope, setFormScope] = useState('');
  const [formValueInput, setFormValueInput] = useState('');
  const [formOwnerId, setFormOwnerId] = useState('');
  const [formStage, setFormStage] = useState<DealStage>('NEW');
  const [formNextContact, setFormNextContact] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Mudança de Estágio no Drawer
  const [targetStage, setTargetStage] = useState<DealStage>('NEW');
  const [wonReason, setWonReason] = useState('');
  const [createClientOnWon, setCreateClientOnWon] = useState(true);
  const [lostReasonCode, setLostReasonCode] = useState<string>('PRICE');
  const [lostReasonDetail, setLostReasonDetail] = useState('');
  const [nextContactDrawer, setNextContactDrawer] = useState('');

  // Nova Interação
  const [interactionType, setInteractionType] = useState<
    'CALL' | 'EMAIL' | 'MEETING' | 'MESSAGE' | 'NOTE'
  >('MESSAGE');
  const [interactionSummary, setInteractionSummary] = useState('');
  const [isLoggingInteraction, setIsLoggingInteraction] = useState(false);

  const fetchDeals = async () => {
    try {
      setIsLoading(true);
      const [dealsData, clientsData, membersData] = await Promise.all([
        api.get<DealItem[]>('/deals'),
        api.get<ClientOption[]>('/clients'),
        api.get<MemberOption[]>('/organizations/members').catch(() => []),
      ]);
      setDeals(dealsData);
      setClients(clientsData);
      setMembers(membersData);
    } catch (err) {
      console.error('Falha ao carregar negociações:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeals();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreateModalOpen(false);
        setActiveDealDetails(null);
        setIsEditingDeal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeDeal = useMemo(() => {
    return deals.find((d) => d.id === activeDealId) || null;
  }, [deals, activeDealId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDealId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDealId(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const targetStage = String(over.id) as DealStage;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === targetStage) return;

    // Atualização otimista imediata na UI
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d)),
    );

    try {
      await api.patch(`/deals/${dealId}/stage`, { stage: targetStage });
    } catch (err: any) {
      console.error('Falha ao mover negociação via drag-and-drop', err);
      fetchDeals();
    }
  };

  const openDealDrawer = async (deal: DealItem, startInEditMode = false) => {
    try {
      const fullDeal = await api.get<DealItem>(`/deals/${deal.id}`);
      setActiveDealDetails(fullDeal);
      setTargetStage(fullDeal.stage);
      setWonReason(fullDeal.wonReason || '');
      setLostReasonCode(fullDeal.lostReasonCode || 'PRICE');
      setLostReasonDetail(fullDeal.lostReasonDetail || '');
      setNextContactDrawer(
        fullDeal.nextContactAt ? fullDeal.nextContactAt.slice(0, 10) : '',
      );
      // Prepara dados de edição
      setEditProspectName(fullDeal.prospectName || '');
      setEditValueText(
        fullDeal.valueCents ? (fullDeal.valueCents / 100).toFixed(2).replace('.', ',') : '',
      );
      setEditSegment(fullDeal.segment || '');
      setEditScope(fullDeal.scope || '');
      setEditNextContact(fullDeal.nextContactAt ? fullDeal.nextContactAt.slice(0, 10) : '');
      setEditNotes(fullDeal.notes || '');
      setIsEditingDeal(startInEditMode);
    } catch (err) {
      console.error('Erro ao abrir detalhes da negociação:', err);
    }
  };

  const handleSaveDealEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDealDetails || !editProspectName.trim()) return;

    try {
      setIsSavingDealEdit(true);
      const cleanValue = editValueText.replace(/\./g, '').replace(',', '.');
      const parsedNum = parseFloat(cleanValue);
      const valueCents = !isNaN(parsedNum) && parsedNum >= 0 ? Math.round(parsedNum * 100) : null;

      const updated = await api.patch<DealItem>(`/deals/${activeDealDetails.id}`, {
        prospectName: editProspectName.trim(),
        valueCents,
        segment: editSegment.trim() || null,
        scope: editScope.trim() || null,
        nextContactAt: editNextContact || null,
        notes: editNotes.trim() || null,
      });

      setActiveDealDetails(updated);
      setDeals((prev) =>
        prev.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)),
      );
      setIsEditingDeal(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar dados da negociação');
    } finally {
      setIsSavingDealEdit(false);
    }
  };

  // Métricas do Funil
  const pipelineMetrics = useMemo(() => {
    let activeTotalCents = 0;
    let wonTotalCents = 0;
    let wonCount = 0;
    let lostCount = 0;

    deals.forEach((d) => {
      const val = d.valueCents || 0;
      if (['NEW', 'CONTACTED', 'PROPOSAL', 'NEGOTIATION'].includes(d.stage)) {
        activeTotalCents += val;
      } else if (d.stage === 'WON') {
        wonTotalCents += val;
        wonCount++;
      } else if (d.stage === 'LOST') {
        lostCount++;
      }
    });

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

    return {
      activeTotalCents,
      wonTotalCents,
      wonCount,
      winRate,
      totalCount: deals.length,
    };
  }, [deals]);

  const filteredDeals = useMemo(() => {
    return deals.filter((d) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.prospectName.toLowerCase().includes(q) ||
        d.client?.name.toLowerCase().includes(q) ||
        d.segment?.toLowerCase().includes(q) ||
        d.scope?.toLowerCase().includes(q)
      );
    });
  }, [deals, searchQuery]);

  // Criação de Negociação
  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProspectName.trim()) return;

    try {
      setIsSavingDeal(true);
      const parsedValue = formValueInput
        ? Math.round(parseFloat(formValueInput.replace(',', '.')) * 100)
        : null;

      await api.post('/deals', {
        prospectName: formProspectName.trim(),
        clientId: formClientId || null,
        segment: formSegment.trim() || null,
        source: formSource.trim() || null,
        scope: formScope.trim() || null,
        valueCents: parsedValue,
        ownerId: formOwnerId || null,
        stage: formStage,
        nextContactAt: formNextContact ? formNextContact : null,
        notes: formNotes.trim() || null,
      });

      setIsCreateModalOpen(false);
      resetForm();
      await fetchDeals();
    } catch (err) {
      console.error('Erro ao criar oportunidade:', err);
      alert('Não foi possível salvar a oportunidade. Verifique os campos.');
    } finally {
      setIsSavingDeal(false);
    }
  };

  const resetForm = () => {
    setFormProspectName('');
    setFormClientId('');
    setFormSegment('');
    setFormSource('Indicação');
    setFormScope('');
    setFormValueInput('');
    setFormOwnerId('');
    setFormStage('NEW');
    setFormNextContact('');
    setFormNotes('');
  };

  // Mudar Estágio
  const handleChangeStage = async () => {
    if (!activeDealDetails) return;

    try {
      setIsSavingDeal(true);
      const payload: any = {
        stage: targetStage,
      };

      if (targetStage === 'WON') {
        payload.wonReason = wonReason || undefined;
        payload.createClient = createClientOnWon;
      } else if (targetStage === 'LOST') {
        payload.lostReasonCode = lostReasonCode;
        payload.lostReasonDetail = lostReasonDetail || undefined;
      }

      if (nextContactDrawer) {
        payload.nextContactAt = nextContactDrawer;
      }

      const updated = await api.patch<DealItem>(
        `/deals/${activeDealDetails.id}/stage`,
        payload,
      );

      setActiveDealDetails(updated);
      await fetchDeals();
    } catch (err) {
      console.error('Erro ao atualizar estágio:', err);
      alert('Falha ao atualizar estágio da oportunidade.');
    } finally {
      setIsSavingDeal(false);
    }
  };

  // Adicionar Interação
  const handleAddInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDealDetails || !interactionSummary.trim()) return;

    try {
      setIsLoggingInteraction(true);
      await api.post(`/deals/${activeDealDetails.id}/interactions`, {
        type: interactionType,
        summary: interactionSummary.trim(),
      });
      setInteractionSummary('');
      // Atualiza o deal ativo com as novas interações
      const refreshed = await api.get<DealItem>(`/deals/${activeDealDetails.id}`);
      setActiveDealDetails(refreshed);
      await fetchDeals();
    } catch (err) {
      console.error('Erro ao registrar interação:', err);
    } finally {
      setIsLoggingInteraction(false);
    }
  };

  return (
    <div className="flex-1 overflow-x-hidden overflow-y-auto px-6 py-8 md:px-10 max-w-[1700px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header com Eyebrow Tag e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase bg-primary/10 text-primary border border-primary/20">
              <Target className="w-3 h-3" />
              Gestão Comercial
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Pipeline & Conversão
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Funil de Vendas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão visual de oportunidades, propostas, negociações e previsão de receita.
          </p>
        </div>

        {/* Botão de Criação Island Button */}
        <button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="group relative inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-300"
        >
          <span>Nova Oportunidade</span>
          <span className="w-6 h-6 rounded-full bg-primary-foreground/15 flex items-center justify-center transition-transform group-hover:scale-110">
            <Plus className="w-4 h-4 text-primary-foreground" />
          </span>
        </button>
      </div>

      {/* KPI Summary — Double-Bezel Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-1 rounded-3xl bg-border/40">
          <div className="p-5 rounded-[calc(1.5rem-4px)] bg-card border border-border/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Pipeline Ativo
              </span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-foreground">
                {formatBrl(pipelineMetrics.activeTotalCents)}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Em negociação aberta</p>
            </div>
          </div>
        </div>

        <div className="p-1 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/5">
          <div className="p-5 rounded-[calc(1.5rem-4px)] bg-card border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Receita Ganha (Fechado)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatBrl(pipelineMetrics.wonTotalCents)}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {pipelineMetrics.wonCount} contrato(s) fechado(s)
              </p>
            </div>
          </div>
        </div>

        <div className="p-1 rounded-3xl bg-indigo-500/10 dark:bg-indigo-500/5">
          <div className="p-5 rounded-[calc(1.5rem-4px)] bg-card border border-indigo-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Taxa de Conversão
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {pipelineMetrics.winRate}%
              </span>
              <p className="text-xs text-muted-foreground mt-1">Ganhos / Finalizados</p>
            </div>
          </div>
        </div>

        <div className="p-1 rounded-3xl bg-border/40">
          <div className="p-5 rounded-[calc(1.5rem-4px)] bg-card border border-border/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total de Oportunidades
              </span>
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-black text-foreground">
                {pipelineMetrics.totalCount}
              </span>
              <p className="text-xs text-muted-foreground mt-1">Leads no sistema</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtro */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por prospect, segmento ou escopo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Kanban Pipeline Columns */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-96 rounded-3xl bg-muted/30 animate-pulse border border-border" />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-start overflow-x-auto pb-6">
            {DEAL_STAGES.map((stage) => {
              const stageDeals = filteredDeals.filter((d) => d.stage === stage);
              const stageTotalCents = stageDeals.reduce((sum, d) => sum + (d.valueCents || 0), 0);
              const style = STAGE_ACCENT[stage];

              return (
                <div
                  key={stage}
                  className="flex flex-col min-w-[260px] rounded-3xl bg-card border border-border/70 overflow-hidden shadow-xs"
                >
                  {/* Header da Coluna */}
                  <div className={`p-4 border-b border-border/60 ${style.headerBg}`}>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-foreground">
                        {DEAL_STAGE_LABELS[stage]}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${style.badgeBg}`}
                      >
                        {stageDeals.length}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      {formatBrl(stageTotalCents)}
                    </p>
                  </div>

                  {/* Lista de Cards da Coluna Droppable */}
                  <DroppableDealColumn stage={stage}>
                    {stageDeals.length === 0 ? (
                      <div className="py-12 text-center text-xs text-muted-foreground/60 border border-dashed border-border/50 rounded-2xl">
                        Nenhuma oportunidade
                      </div>
                    ) : (
                      stageDeals.map((deal) => (
                        <DraggableDealCard
                          key={deal.id}
                          deal={deal}
                          onOpenDetail={openDealDrawer}
                          onOpenEdit={(d) => openDealDrawer(d, true)}
                        />
                      ))
                    )}
                  </DroppableDealColumn>
                </div>
              );
            })}
          </div>

          <DragOverlay zIndex={9999}>
            {activeDeal ? (
              <div className="w-[260px] p-4 rounded-2xl bg-card border-2 border-primary shadow-2xl space-y-2.5 pointer-events-none rotate-1 opacity-95">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-xs font-bold text-foreground line-clamp-1">
                    {activeDeal.prospectName}
                  </h4>
                  {activeDeal.segment && (
                    <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">
                      {activeDeal.segment}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-primary">
                    {activeDeal.valueCents ? formatBrl(activeDeal.valueCents) : 'A definir'}
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Modal: Nova Oportunidade */}
      {isCreateModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsCreateModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-card w-full max-w-xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Nova Oportunidade de Venda</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Cadastre um lead ou negociação no funil comercial.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Nome do Prospect */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nome do Lead / Empresa *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Clínica Alpha Odonto ou João Silva"
                  value={formProspectName}
                  onChange={(e) => setFormProspectName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Segmento */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Segmento / Nicho
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Odontologia, E-commerce, Saúde"
                    value={formSegment}
                    onChange={(e) => setFormSegment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Origem */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Origem do Lead
                  </label>
                  <select
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="Indicação">Indicação</option>
                    <option value="Tráfego Pago (Instagram/Meta)">Tráfego Pago (Meta)</option>
                    <option value="Google Ads">Google Ads</option>
                    <option value="Outbound / Prospecção Ativa">Outbound / Prospecção Ativa</option>
                    <option value="Orgânico / Rede Social">Orgânico / Redes Sociais</option>
                    <option value="Evento">Evento / Networking</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Valor Estimado */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Valor da Proposta (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 5000.00"
                    value={formValueInput}
                    onChange={(e) => setFormValueInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Estágio Inicial */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Estágio Inicial
                  </label>
                  <select
                    value={formStage}
                    onChange={(e) => setFormStage(e.target.value as DealStage)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {DEAL_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {DEAL_STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Responsável (Owner) */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Responsável (Closer / SDR)
                  </label>
                  <select
                    value={formOwnerId}
                    onChange={(e) => setFormOwnerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">Não atribuído</option>
                    {members.map((m) => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name} ({m.user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Próximo Contato */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Data do Próximo Contato
                  </label>
                  <input
                    type="date"
                    value={formNextContact}
                    onChange={(e) => setFormNextContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Escopo do Projeto */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Escopo dos Serviços
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Gestão de tráfego pago + criação de 12 criativos por mês + landing page"
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value)}
                  className="w-full p-3 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              {/* Rodapé com botões */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingDeal}
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isSavingDeal ? 'Salvando...' : 'Adicionar Oportunidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer / Modal de Detalhes da Oportunidade */}
      {activeDealDetails && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveDealDetails(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        >
          <div className="bg-card w-full max-w-3xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header do Drawer */}
            <div className="px-6 py-5 border-b border-border flex items-start justify-between bg-muted/20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      STAGE_ACCENT[activeDealDetails.stage]?.badgeBg
                    }`}
                  >
                    {DEAL_STAGE_LABELS[activeDealDetails.stage]}
                  </span>
                  {activeDealDetails.segment && (
                    <span className="text-xs font-medium text-muted-foreground">
                      • {activeDealDetails.segment}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-black text-foreground">
                  {activeDealDetails.prospectName}
                </h2>
                <p className="text-lg font-extrabold text-primary mt-1">
                  {formatBrl(activeDealDetails.valueCents)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingDeal(!isEditingDeal)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isEditingDeal
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-background hover:bg-muted text-foreground border border-border'
                  }`}
                  title="Editar dados da negociação (nome, valor, segmento, etc)"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingDeal ? 'Fechar Edição' : 'Editar Oportunidade'}</span>
                </button>
                <button
                  onClick={() => setActiveDealDetails(null)}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {isEditingDeal ? (
                /* Formulário de Edição Completa da Negociação */
                <form onSubmit={handleSaveDealEdit} className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Editar Dados da Oportunidade</h3>
                      <p className="text-xs text-muted-foreground">Atualize o nome da negociação, valor da proposta e detalhes comerciais.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Nome da Empresa / Prospect *
                      </label>
                      <input
                        type="text"
                        required
                        value={editProspectName}
                        onChange={(e) => setEditProspectName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Ex: Clínica Alpha Odontologia"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Valor Estimado / Proposta (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-muted-foreground">R$</span>
                        <input
                          type="text"
                          placeholder="0,00"
                          value={editValueText}
                          onChange={(e) => setEditValueText(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Segmento de Atuação
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Clínicas & Estética"
                        value={editSegment}
                        onChange={(e) => setEditSegment(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Próximo Retorno / Follow-up
                      </label>
                      <input
                        type="date"
                        value={editNextContact}
                        onChange={(e) => setEditNextContact(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Escopo dos Serviços / Proposta
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Gestão de tráfego pago + criação de criativos + landing page..."
                      value={editScope}
                      onChange={(e) => setEditScope(e.target.value)}
                      className="w-full p-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Observações & Notas Comerciais
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Anotações sobre decisores, orçamento, objeções..."
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full p-3 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsEditingDeal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingDealEdit || !editProspectName.trim()}
                      className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                      {isSavingDealEdit ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Bloco de Mudança de Estágio */}
                  <div className="p-5 rounded-2xl bg-card border border-border shadow-xs space-y-4">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      Avançar / Alterar Estágio da Negociação
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {DEAL_STAGES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setTargetStage(st)}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                            targetStage === st
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-background hover:bg-muted border-border text-muted-foreground'
                          }`}
                        >
                          {DEAL_STAGE_LABELS[st]}
                        </button>
                      ))}
                    </div>

                    {/* Condicional de Fechamento (Ganho) */}
                    {targetStage === 'WON' && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createClientOnWon}
                            onChange={(e) => setCreateClientOnWon(e.target.checked)}
                            className="rounded text-primary focus:ring-primary"
                          />
                          Criar cliente automaticamente no CRM de Clientes
                        </label>
                        <div>
                          <label className="block text-[11px] font-semibold text-foreground mb-1">
                            Motivo do Ganho / Diferencial Decisivo
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Apresentação da estratégia sob medida e cases de sucesso"
                            value={wonReason}
                            onChange={(e) => setWonReason(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Condicional de Perda */}
                    {targetStage === 'LOST' && (
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-rose-700 dark:text-rose-400 mb-1">
                            Motivo da Perda *
                          </label>
                          <select
                            value={lostReasonCode}
                            onChange={(e) => setLostReasonCode(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none"
                          >
                            {Object.entries(DEAL_LOST_REASONS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-foreground mb-1">
                            Detalhes da Perda (Auditoria)
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Achou a proposta 30% acima do orçamento atual"
                            value={lostReasonDetail}
                            onChange={(e) => setLostReasonDetail(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Próximo Retorno:</span>
                        <input
                          type="date"
                          value={nextContactDrawer}
                          onChange={(e) => setNextContactDrawer(e.target.value)}
                          className="px-2.5 py-1 text-xs rounded-lg bg-background border border-border text-foreground"
                        />
                      </div>

                      <button
                        onClick={handleChangeStage}
                        disabled={isSavingDeal}
                        className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
                      >
                        {isSavingDeal ? 'Salvando...' : 'Atualizar Estágio'}
                      </button>
                    </div>
                  </div>

                  {/* Informações Gerais & Escopo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-card border border-border text-xs space-y-2">
                      <span className="font-bold text-muted-foreground uppercase tracking-wider block">
                        Detalhes Comerciais
                      </span>
                      <p>
                        <strong className="text-foreground">Origem:</strong>{' '}
                        <span className="text-muted-foreground">
                          {activeDealDetails.source || 'Não informada'}
                        </span>
                      </p>
                      <p>
                        <strong className="text-foreground">Responsável:</strong>{' '}
                        <span className="text-muted-foreground">
                          {activeDealDetails.owner?.name || 'Não atribuído'}
                        </span>
                      </p>
                      <p>
                        <strong className="text-foreground">Criado em:</strong>{' '}
                        <span className="text-muted-foreground">
                          {new Date(activeDealDetails.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-card border border-border text-xs space-y-2">
                      <span className="font-bold text-muted-foreground uppercase tracking-wider block">
                        Escopo & Observações
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {activeDealDetails.scope || activeDealDetails.notes || 'Sem notas cadastradas.'}
                      </p>
                    </div>
                  </div>

                  {/* Timeline de Interações */}
                  <div className="space-y-4 pt-2">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      Histórico de Interações (Timeline)
                    </h3>

                    {/* Formulário Rápido de Interação */}
                    <form
                      onSubmit={handleAddInteraction}
                      className="p-4 rounded-2xl bg-background border border-border space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        {(['MESSAGE', 'CALL', 'MEETING', 'EMAIL', 'NOTE'] as const).map((t) => {
                          const Icon = INTERACTION_ICONS[t] || MessageSquare;
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setInteractionType(t)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                interactionType === t
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-card hover:bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{t}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Resumo do contato (ex: Reunião de apresentação feita, cliente pediu desconto no setup)..."
                          value={interactionSummary}
                          onChange={(e) => setInteractionSummary(e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-card border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isLoggingInteraction || !interactionSummary.trim()}
                          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                        >
                          Registrar
                        </button>
                      </div>
                    </form>

                    {/* Lista da Linha do Tempo */}
                    <div className="space-y-2.5">
                      {activeDealDetails.interactions && activeDealDetails.interactions.length > 0 ? (
                        activeDealDetails.interactions.map((it) => {
                          const Icon = INTERACTION_ICONS[it.type] || MessageSquare;
                          return (
                            <div
                              key={it.id}
                              className="flex items-start gap-3 p-3.5 rounded-2xl bg-card border border-border/70"
                            >
                              <div className="w-7 h-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                  <span className="font-bold text-foreground">{it.type}</span>
                                  <span>{new Date(it.occurredAt).toLocaleString('pt-BR')}</span>
                                </div>
                                <p className="text-xs text-foreground leading-relaxed">{it.summary}</p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Nenhuma interação registrada ainda para esta negociação.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
