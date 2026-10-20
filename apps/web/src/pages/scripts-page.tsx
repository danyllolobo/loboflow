import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Video,
  Copy,
  Check,
  Edit3,
  Calendar,
  Sparkles,
  Layers,
  History,
  X,
  ChevronDown,
  ArrowUpRight,
  Eye,
  AlertCircle,
} from 'lucide-react';
import {
  DEFAULT_SCRIPT_FORMATS,
  SCRIPT_STATUS_LABELS,
  ScriptStatus,
} from '@loboflow/shared';

interface ScriptVersion {
  id: string;
  version: number;
  content: string;
  changeNote?: string | null;
  createdAt: string;
  author?: { id: string; name: string };
}

interface ScriptItem {
  id: string;
  title: string;
  format: string;
  campaign?: string | null;
  referenceMonth?: string | null;
  status: ScriptStatus;
  currentVersion: number;
  content: string;
  createdAt: string;
  updatedAt: string;
  clientId: string;
  client: { id: string; name: string; segment?: string | null };
  author?: { id: string; name: string };
  versions?: ScriptVersion[];
}

interface ClientOption {
  id: string;
  name: string;
}

const STATUS_COLORS: Record<ScriptStatus, { bg: string; text: string; border: string }> = {
  DRAFT: {
    bg: 'bg-zinc-500/10 dark:bg-zinc-500/20',
    text: 'text-zinc-600 dark:text-zinc-400',
    border: 'border-zinc-500/30',
  },
  REVIEW: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  APPROVED: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  RECORDED: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
  },
  PUBLISHED: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
  },
};

const FORMAT_BADGES: Record<string, { bg: string; text: string }> = {
  Reels: { bg: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', text: 'text-pink-600' },
  Stories: { bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', text: 'text-amber-600' },
  Feed: { bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', text: 'text-blue-600' },
  Carrossel: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-600' },
  YouTube: { bg: 'bg-red-500/10 text-red-600 dark:text-red-400', text: 'text-red-600' },
};

export function ScriptsPage() {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptItem | null>(null);
  const [modalClientId, setModalClientId] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalFormat, setModalFormat] = useState('Reels');
  const [modalCampaign, setModalCampaign] = useState('');
  const [modalReferenceMonth, setModalReferenceMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [modalContent, setModalContent] = useState('');
  const [modalVersionNote, setModalVersionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal de Histórico de Versões
  const [historyScript, setHistoryScript] = useState<ScriptItem | null>(null);

  const fetchScripts = async () => {
    try {
      setIsLoading(true);
      const [scriptsData, clientsData] = await Promise.all([
        api.get<ScriptItem[]>('/scripts'),
        api.get<ClientOption[]>('/clients'),
      ]);
      setScripts(scriptsData);
      setClients(clientsData);
    } catch (err) {
      console.error('Falha ao carregar roteiros:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScripts();
  }, []);

  const filteredScripts = useMemo(() => {
    return scripts.filter((s) => {
      const matchSearch =
        searchQuery === '' ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.client?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.content.toLowerCase().includes(searchQuery.toLowerCase());

      const matchFormat = selectedFormat === 'ALL' || s.format === selectedFormat;
      const matchStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
      const matchClient = selectedClientId === 'ALL' || s.clientId === selectedClientId;

      return matchSearch && matchFormat && matchStatus && matchClient;
    });
  }, [scripts, searchQuery, selectedFormat, selectedStatus, selectedClientId]);

  // Estatísticas KPI
  const stats = useMemo(() => {
    const total = scripts.length;
    const review = scripts.filter((s) => s.status === 'REVIEW').length;
    const approved = scripts.filter((s) => s.status === 'APPROVED').length;
    const recorded = scripts.filter((s) => s.status === 'RECORDED').length;
    const published = scripts.filter((s) => s.status === 'PUBLISHED').length;
    return { total, review, approved, recorded, published };
  }, [scripts]);

  const handleOpenCreateModal = () => {
    setEditingScript(null);
    setModalClientId(clients[0]?.id || '');
    setModalTitle('');
    setModalFormat('Reels');
    setModalCampaign('');
    setModalReferenceMonth(new Date().toISOString().slice(0, 7));
    setModalContent('');
    setModalVersionNote('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (script: ScriptItem) => {
    setEditingScript(script);
    setModalClientId(script.clientId);
    setModalTitle(script.title);
    setModalFormat(script.format);
    setModalCampaign(script.campaign || '');
    setModalReferenceMonth(script.referenceMonth || new Date().toISOString().slice(0, 7));
    setModalContent(script.content || '');
    setModalVersionNote('');
    setIsModalOpen(true);
  };

  const handleSaveScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim() || !modalClientId) return;

    try {
      setIsSaving(true);
      if (editingScript) {
        await api.patch(`/scripts/${editingScript.id}`, {
          title: modalTitle,
          format: modalFormat,
          campaign: modalCampaign || null,
          referenceMonth: modalReferenceMonth || null,
          content: modalContent,
          versionNote: modalVersionNote || undefined,
        });
      } else {
        await api.post('/scripts', {
          clientId: modalClientId,
          title: modalTitle,
          format: modalFormat,
          campaign: modalCampaign || null,
          referenceMonth: modalReferenceMonth || null,
          content: modalContent,
          status: 'DRAFT',
        });
      }

      setIsModalOpen(false);
      await fetchScripts();
    } catch (err) {
      console.error('Erro ao salvar roteiro:', err);
      alert('Não foi possível salvar o roteiro. Verifique os dados informados.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (scriptId: string, newStatus: ScriptStatus) => {
    try {
      await api.patch(`/scripts/${scriptId}/status`, { status: newStatus });
      setScripts((prev) =>
        prev.map((s) => (s.id === scriptId ? { ...s, status: newStatus } : s)),
      );
    } catch (err) {
      console.error('Erro ao atualizar status do roteiro:', err);
    }
  };

  const handleCopyContent = (script: ScriptItem) => {
    navigator.clipboard.writeText(script.content);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleInsertTemplate = (type: 'reel' | 'carrossel') => {
    if (type === 'reel') {
      const template = `[GANCHO - 0 a 3 segundos]\n(Texto na tela + frase impactante direta para prender a atenção)\n\n[PROBLEMA / CONTEXTO - 3 a 15 segundos]\n(Identificação da dor ou desejo real do público-alvo)\n\n[SOLUÇÃO & CONTEÚDO PRÁTICO - 15 a 45 segundos]\n(Passo a passo ou técnica prática aplicável imediatamente)\n\n[CHAMADA PARA AÇÃO (CTA) - 45 a 60 segundos]\n(Comente 'QUERO' ou salve este vídeo para consultar depois)`;
      setModalContent((prev) => (prev ? `${prev}\n\n${template}` : template));
    } else {
      const template = `[CARD 1 - CAPA]\nTítulo Chamativo + Subtítulo de Alta Curiosidade\n\n[CARD 2 - O PROBLEMA]\nPor que a maioria erra nisso...\n\n[CARD 3 - O PASSO A PASSO]\nEtapa fundamental 1...\n\n[CARD 4 - DETALHE TÉCNICO]\nDica de ouro que muda o jogo...\n\n[CARD 5 - RESUMO & CTA]\nSalve este post e compartilhe com seu sócio!`;
      setModalContent((prev) => (prev ? `${prev}\n\n${template}` : template));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Top Header com Eyebrow Tag e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" />
              Biblioteca Editorial
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Multi-Tenant & Versionamento
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Roteiros de Conteúdo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planejamento editorial, roteirização de vídeos e aprovação de entregáveis para clientes.
          </p>
        </div>

        {/* Botão de Criação Island Button */}
        <button
          onClick={handleOpenCreateModal}
          className="group relative inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-300"
        >
          <span>Novo Roteiro</span>
          <span className="w-6 h-6 rounded-full bg-primary-foreground/15 flex items-center justify-center transition-transform group-hover:scale-110">
            <Plus className="w-4 h-4 text-primary-foreground" />
          </span>
        </button>
      </div>

      {/* KPI Cards — Soft Double-Bezel Design */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-1 rounded-2xl bg-border/40">
          <div className="p-4 rounded-[calc(1rem-4px)] bg-card border border-border/50 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total
              </span>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-foreground">{stats.total}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Roteiros cadastrados</p>
            </div>
          </div>
        </div>

        <div className="p-1 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5">
          <div className="p-4 rounded-[calc(1rem-4px)] bg-card border border-amber-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                Em Revisão
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {stats.review}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Aguardando aprovação</p>
            </div>
          </div>
        </div>

        <div className="p-1 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/5">
          <div className="p-4 rounded-[calc(1rem-4px)] bg-card border border-emerald-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Aprovados
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.approved}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Prontos para gravação</p>
            </div>
          </div>
        </div>

        <div className="p-1 rounded-2xl bg-blue-500/10 dark:bg-blue-500/5">
          <div className="p-4 rounded-[calc(1rem-4px)] bg-card border border-blue-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Gravados
              </span>
              <Video className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {stats.recorded}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">Em fase de edição</p>
            </div>
          </div>
        </div>

        <div className="p-1 rounded-2xl bg-purple-500/10 dark:bg-purple-500/5">
          <div className="p-4 rounded-[calc(1rem-4px)] bg-card border border-purple-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Publicados
              </span>
              <ArrowUpRight className="w-4 h-4 text-purple-500" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {stats.published}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">No ar nas redes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por título, cliente ou fala..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Seletor de Cliente */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">Todos os Clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Seletor de Formato */}
          <div className="flex items-center bg-background rounded-xl p-1 border border-border gap-1 overflow-x-auto max-w-full">
            <button
              onClick={() => setSelectedFormat('ALL')}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                selectedFormat === 'ALL'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Todos
            </button>
            {DEFAULT_SCRIPT_FORMATS.map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  selectedFormat === fmt
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>

          {/* Seletor de Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="ALL">Todos os Status</option>
            {Object.entries(SCRIPT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista / Grid de Roteiros */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-muted/40 animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredScripts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-dashed border-border bg-card/40 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Nenhum roteiro encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {searchQuery || selectedFormat !== 'ALL' || selectedStatus !== 'ALL'
              ? 'Tente ajustar seus filtros para encontrar o roteiro desejado.'
              : 'Comece criando seu primeiro roteiro editorial para aprovação do cliente.'}
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Criar Primeiro Roteiro
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredScripts.map((script) => {
            const statusConfig = STATUS_COLORS[script.status] || STATUS_COLORS.DRAFT;
            const formatConfig = FORMAT_BADGES[script.format] || {
              bg: 'bg-zinc-500/10 text-zinc-600',
              text: 'text-zinc-600',
            };

            return (
              <div
                key={script.id}
                className="group p-1 rounded-3xl bg-border/40 hover:bg-border/80 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col"
              >
                <div className="p-5 rounded-[calc(1.5rem-4px)] bg-card border border-border/60 flex-1 flex flex-col justify-between">
                  {/* Cabeçalho do Card */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-primary tracking-wide truncate">
                        {script.client?.name || 'Cliente'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${formatConfig.bg}`}
                        >
                          {script.format}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground">
                          v{script.currentVersion}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {script.title}
                    </h3>

                    {script.campaign && (
                      <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                        Campanha: {script.campaign}
                      </p>
                    )}

                    {/* Preview do Conteúdo */}
                    <div className="mt-3 p-3 rounded-xl bg-background/80 border border-border/50 text-xs text-muted-foreground font-mono leading-relaxed line-clamp-3 min-h-[4.5rem]">
                      {script.content || '(Roteiro vazio. Clique para adicionar conteúdo)'}
                    </div>
                  </div>

                  {/* Rodapé do Card com Status e Ações */}
                  <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    {/* Seletor Rápido de Status */}
                    <div className="relative">
                      <select
                        value={script.status}
                        onChange={(e) =>
                          handleStatusChange(script.id, e.target.value as ScriptStatus)
                        }
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} appearance-none pr-6 cursor-pointer focus:outline-none`}
                      >
                        {Object.entries(SCRIPT_STATUS_LABELS).map(([stKey, stLabel]) => (
                          <option key={stKey} value={stKey}>
                            {stLabel}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>

                    {/* Ações: Copiar, Histórico, Editar */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyContent(script)}
                        title="Copiar Roteiro"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        {copiedId === script.id ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => setHistoryScript(script)}
                        title="Histórico de Versões"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <History className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(script)}
                        title="Editar Roteiro"
                        className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Roteiro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-3xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header do Modal */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingScript ? 'Editar Roteiro' : 'Novo Roteiro de Conteúdo'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preencha os detalhes e o texto que será gravado ou publicado.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário com Scroll */}
            <form onSubmit={handleSaveScript} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cliente */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Cliente *
                  </label>
                  <select
                    value={modalClientId}
                    onChange={(e) => setModalClientId(e.target.value)}
                    required
                    disabled={!!editingScript}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  >
                    <option value="">Selecione o Cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Formato */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Formato do Conteúdo *
                  </label>
                  <select
                    value={modalFormat}
                    onChange={(e) => setModalFormat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {DEFAULT_SCRIPT_FORMATS.map((fmt) => (
                      <option key={fmt} value={fmt}>
                        {fmt}
                      </option>
                    ))}
                    <option value="TikTok">TikTok</option>
                    <option value="LinkedIn">Artigo / LinkedIn</option>
                  </select>
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Título do Roteiro *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 3 Erros Fatais ao Investir em Tráfego Pago"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Campanha */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Campanha / Tema
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Black Friday ou Lançamento Mentoria"
                    value={modalCampaign}
                    onChange={(e) => setModalCampaign(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Mês de Referência */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Mês de Referência (AAAA-MM)
                  </label>
                  <input
                    type="month"
                    value={modalReferenceMonth}
                    onChange={(e) => setModalReferenceMonth(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Editor de Texto do Roteiro */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Corpo do Roteiro & Falas *
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Modelos rápidos:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('reel')}
                      className="text-[11px] font-semibold text-primary hover:underline"
                    >
                      + Estrutura Reels
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('carrossel')}
                      className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      + Estrutura Carrossel
                    </button>
                  </div>
                </div>
                <textarea
                  rows={10}
                  placeholder="Escreva aqui a narrativa, ganchos visuais e falas do roteiro..."
                  value={modalContent}
                  onChange={(e) => setModalContent(e.target.value)}
                  className="w-full p-4 rounded-xl bg-background border border-border font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y"
                />
                <div className="flex justify-between items-center mt-1 text-[11px] text-muted-foreground">
                  <span>Dica: Use colchetes como [GANCHO], [CENA] para orientar o criador.</span>
                  <span>{modalContent.length} caracteres</span>
                </div>
              </div>

              {/* Nota de Versão (ao editar) */}
              {editingScript && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Nota da Nova Versão (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Ajustei o gancho de abertura conforme pedido do cliente"
                    value={modalVersionNote}
                    onChange={(e) => setModalVersionNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              )}

              {/* Botões do Rodapé */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : editingScript ? 'Salvar Nova Versão' : 'Criar Roteiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Versões */}
      {historyScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Histórico de Versões</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{historyScript.title}</p>
              </div>
              <button
                onClick={() => setHistoryScript(null)}
                className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-primary">
                    Versão Atual (v{historyScript.currentVersion})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(historyScript.updatedAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <pre className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto p-3 rounded-xl bg-background border border-border">
                  {historyScript.content}
                </pre>
              </div>

              {historyScript.versions && historyScript.versions.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Versões Anteriores
                  </h4>
                  {historyScript.versions.map((ver) => (
                    <div
                      key={ver.id}
                      className="p-4 rounded-2xl bg-card border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          Versão {ver.version}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(ver.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      {ver.changeNote && (
                        <p className="text-xs text-primary font-medium italic">
                          Nota: {ver.changeNote}
                        </p>
                      )}
                      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto p-3 rounded-xl bg-background border border-border">
                        {ver.content}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Nenhuma revisão anterior registrada para este roteiro.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
