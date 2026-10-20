import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import {
  Users2,
  Plus,
  Mail,
  Phone,
  Globe,
  Briefcase,
  X,
  Clock,
  Sparkles,
  Edit3,
  Archive,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { CLIENT_STATUS_LABELS, CLIENT_STATUSES, ClientStatus } from '@loboflow/shared';

export function ClientsPage() {
  const { activeOrg } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [editingClient, setEditingClient] = useState<any | null>(null);

  // Form Criar
  const [name, setName] = useState('');
  const [segment, setSegment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [restrictions, setRestrictions] = useState('');

  // Form Editar
  const [editName, setEditName] = useState('');
  const [editSegment, setEditSegment] = useState('');
  const [editStatus, setEditStatus] = useState<ClientStatus>('ACTIVE');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editTargetAudience, setEditTargetAudience] = useState('');
  const [editToneOfVoice, setEditToneOfVoice] = useState('');
  const [editRestrictions, setEditRestrictions] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get<any[]>('/clients');
      setClients(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Falha ao carregar clientes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg?.organizationId]);

  // Tecla ESC para fechar modais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNewModalOpen(false);
        setSelectedClient(null);
        setEditingClient(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await api.post('/clients', {
        name: name.trim(),
        segment: segment.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        profile: {
          targetAudience: targetAudience.trim() || undefined,
          toneOfVoice: toneOfVoice.trim() || undefined,
          restrictions: restrictions.trim() || undefined,
        },
      });
      setName('');
      setSegment('');
      setEmail('');
      setPhone('');
      setWebsite('');
      setTargetAudience('');
      setToneOfVoice('');
      setRestrictions('');
      setNewModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar cliente');
    }
  };

  const handleOpenDetail = async (id: string) => {
    try {
      const client = await api.get(`/clients/${id}`);
      setSelectedClient(client);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEdit = (client: any) => {
    setEditingClient(client);
    setEditName(client.name || '');
    setEditSegment(client.segment || '');
    setEditStatus(client.status || 'ACTIVE');
    setEditEmail(client.email || '');
    setEditPhone(client.phone || '');
    setEditWebsite(client.website || '');
    setEditTargetAudience(client.profile?.targetAudience || '');
    setEditToneOfVoice(client.profile?.toneOfVoice || '');
    setEditRestrictions(client.profile?.restrictions || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editName.trim()) return;

    try {
      setIsSavingEdit(true);
      const updated = await api.patch(`/clients/${editingClient.id}`, {
        name: editName.trim(),
        segment: editSegment.trim() || null,
        status: editStatus,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        website: editWebsite.trim() || null,
        profile: {
          targetAudience: editTargetAudience.trim() || undefined,
          toneOfVoice: editToneOfVoice.trim() || undefined,
          restrictions: editRestrictions.trim() || undefined,
        },
      });

      if (selectedClient && selectedClient.id === editingClient.id) {
        setSelectedClient(updated);
      }
      setEditingClient(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar cliente');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Deseja realmente arquivar este cliente?')) return;
    try {
      await api.post(`/clients/${id}/archive`);
      setSelectedClient(null);
      setEditingClient(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao arquivar cliente');
    }
  };

  const getStatusBadge = (status: ClientStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'LEAD':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'PAUSED':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'CHURNED':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-muted-foreground bg-secondary border-border';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Carteira de Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestão completa das contas atendidas, diretrizes de marca, contatos e projetos.
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all shadow-md cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" /> Novo Cliente
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          <Clock className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando carteira de clientes...
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-secondary/20 max-w-md mx-auto my-8">
          <Users2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">Nenhum cliente cadastrado</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Cadastre os clientes atendidos pela agência para vincular demandas, briefing e roteiros.
          </p>
          <button
            onClick={() => setNewModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground cursor-pointer shadow-sm"
          >
            Cadastrar Cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group relative"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <div
                    onClick={() => handleOpenDetail(c.id)}
                    className="cursor-pointer min-w-0 flex-1"
                  >
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {c.name}
                    </h3>
                    {c.segment && (
                      <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 mt-0.5 truncate">
                        <Briefcase className="h-3 w-3 shrink-0" /> {c.segment}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                        c.status,
                      )}`}
                    >
                      {CLIENT_STATUS_LABELS[c.status as ClientStatus] || c.status}
                    </span>
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Editar Cliente"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  onClick={() => handleOpenDetail(c.id)}
                  className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border/60 cursor-pointer"
                >
                  {c.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2 truncate">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{c.phone}</span>
                    </div>
                  )}
                  {c.website && (
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{c.website}</span>
                    </div>
                  )}
                  {!c.email && !c.phone && !c.website && (
                    <span className="text-muted-foreground/60 italic text-[11px]">Nenhum contato cadastrado</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 border-t border-border/40 font-medium">
                <span className="flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  {c._count?.projects || 0} Projetos
                </span>
                <button
                  onClick={() => handleOpenDetail(c.id)}
                  className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                >
                  Ver Ficha →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Cliente */}
      {newModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display">Cadastrar Novo Cliente</h2>
              <button
                onClick={() => setNewModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Vitória Colchões"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Segmento</label>
                  <input
                    type="text"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex.: Varejo e Móveis"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">E-mail Principal</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@cliente.com"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Site</label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://cliente.com"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Seção Diretrizes de Marca */}
              <div className="pt-3 border-t border-border space-y-3">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Particularidades de Marketing & IA
                </span>

                <div>
                  <label className="block text-xs font-semibold mb-1">Público-Alvo</label>
                  <textarea
                    rows={2}
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Ex.: Famílias e jovens casais procurando conforto com preço acessível..."
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Tom de Voz</label>
                  <input
                    type="text"
                    value={toneOfVoice}
                    onChange={(e) => setToneOfVoice(e.target.value)}
                    placeholder="Ex.: Descontraído, acolhedor, focado em benefícios práticos"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Restrições / O que NÃO falar</label>
                  <input
                    type="text"
                    value={restrictions}
                    onChange={(e) => setRestrictions(e.target.value)}
                    placeholder="Ex.: Não usar termos de garantia vitalícia ou promessas irreais"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes do Cliente */}
      {selectedClient && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedClient(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-border gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold font-display break-words">{selectedClient.name}</h2>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      selectedClient.status,
                    )}`}
                  >
                    {CLIENT_STATUS_LABELS[selectedClient.status as ClientStatus] || selectedClient.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedClient.segment || 'Segmento não informado'}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleOpenEdit(selectedClient)}
                  className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Editar
                </button>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Contatos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-secondary/30 border border-border/60 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">E-mail</span>
                <span className="font-medium text-foreground break-all">{selectedClient.email || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Telefone</span>
                <span className="font-medium text-foreground">{selectedClient.phone || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Site</span>
                {selectedClient.website ? (
                  <a
                    href={selectedClient.website.startsWith('http') ? selectedClient.website : `https://${selectedClient.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline break-all"
                  >
                    {selectedClient.website}
                  </a>
                ) : (
                  <span className="font-medium text-foreground">—</span>
                )}
              </div>
            </div>

            {/* Perfil de Marketing */}
            {selectedClient.profile && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3 text-xs">
                <h4 className="font-bold text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Diretrizes de Marketing e Tom de Voz
                </h4>
                {selectedClient.profile.toneOfVoice && (
                  <div>
                    <strong className="text-foreground">Tom de Voz:</strong>{' '}
                    <span className="text-muted-foreground">{selectedClient.profile.toneOfVoice}</span>
                  </div>
                )}
                {selectedClient.profile.targetAudience && (
                  <div>
                    <strong className="text-foreground">Público-Alvo:</strong>{' '}
                    <span className="text-muted-foreground">{selectedClient.profile.targetAudience}</span>
                  </div>
                )}
                {selectedClient.profile.restrictions && (
                  <div>
                    <strong className="text-rose-400">Restrições / Proibições:</strong>{' '}
                    <span className="text-muted-foreground">{selectedClient.profile.restrictions}</span>
                  </div>
                )}
              </div>
            )}

            {/* Projetos do Cliente */}
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Projetos Vinculados ({selectedClient.projects?.length || 0})
              </h3>
              {selectedClient.projects?.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedClient.projects.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3 bg-secondary/30 rounded-xl text-xs flex justify-between items-center border border-border/50"
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-0.5 rounded-md bg-secondary">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum projeto associado a este cliente ainda.</p>
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-between items-center">
              <button
                type="button"
                onClick={() => handleArchive(selectedClient.id)}
                className="text-xs text-rose-500 hover:text-rose-400 flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <Archive className="h-3.5 w-3.5" /> Arquivar Cliente
              </button>

              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Cliente */}
      {editingClient && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingClient(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display">Editar Cliente</h2>
              <button
                onClick={() => setEditingClient(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Segmento</label>
                  <input
                    type="text"
                    value={editSegment}
                    onChange={(e) => setEditSegment(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Status da Conta</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ClientStatus)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {CLIENT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {CLIENT_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Site</label>
                <input
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="pt-3 border-t border-border space-y-3">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Particularidades de Marketing & IA
                </span>

                <div>
                  <label className="block text-xs font-semibold mb-1">Público-Alvo</label>
                  <textarea
                    rows={2}
                    value={editTargetAudience}
                    onChange={(e) => setEditTargetAudience(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Tom de Voz</label>
                  <input
                    type="text"
                    value={editToneOfVoice}
                    onChange={(e) => setEditToneOfVoice(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Restrições / Proibições</label>
                  <input
                    type="text"
                    value={editRestrictions}
                    onChange={(e) => setEditRestrictions(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
