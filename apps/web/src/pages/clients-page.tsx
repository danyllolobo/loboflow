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
} from 'lucide-react';
import { CLIENT_STATUS_LABELS, ClientStatus } from '@loboflow/shared';

export function ClientsPage() {
  const { activeOrg } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  // Form
  const [name, setName] = useState('');
  const [segment, setSegment] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [restrictions, setRestrictions] = useState('');

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await api.post('/clients', {
        name,
        segment: segment || undefined,
        email: email || undefined,
        phone: phone || undefined,
        website: website || undefined,
        profile: {
          targetAudience: targetAudience || undefined,
          toneOfVoice: toneOfVoice || undefined,
          restrictions: restrictions || undefined,
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Carteira de Clientes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestão das empresas atendidas, tom de voz, público e restrições de comunicação.
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo Cliente
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          <Clock className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando carteira...
        </div>
      ) : clients.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-secondary/20 max-w-md mx-auto my-8">
          <Users2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">Nenhum cliente cadastrado</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Cadastre o primeiro cliente da agência para vincular demandas e roteiros.
          </p>
          <button
            onClick={() => setNewModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
          >
            Cadastrar Cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div
              key={c.id}
              onClick={() => handleOpenDetail(c.id)}
              className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    {c.name}
                  </h3>
                  {c.segment && (
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mt-0.5">
                      <Briefcase className="h-3 w-3" /> {c.segment}
                    </span>
                  )}
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {CLIENT_STATUS_LABELS[c.status as ClientStatus] || c.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border/50">
                {c.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                )}
                {c.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c.website && (
                  <div className="flex items-center gap-2 truncate">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{c.website}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/40 font-medium">
                <span>{c._count?.projects || 0} Projetos</span>
                <span>{c._count?.tasks || 0} Tarefas</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Cliente */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display">Cadastrar Novo Cliente</h2>
              <button onClick={() => setNewModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Nome / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Vitória Colchões"
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Segmento</label>
                  <input
                    type="text"
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    placeholder="Ex.: Varejo e Colchões"
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">E-mail Principal</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@vitoriacolchoes.com.br"
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Site</label>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://vitoriacolchoes.com.br"
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Seção Particularidades da Agência */}
              <div className="pt-2 border-t border-border space-y-3">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Particularidades de Marketing
                </span>

                <div>
                  <label className="block text-xs font-medium mb-1">Público-Alvo</label>
                  <textarea
                    rows={2}
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Ex.: Famílias classe B e C buscando conforto e saúde do sono..."
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Tom de Voz</label>
                  <input
                    type="text"
                    value={toneOfVoice}
                    onChange={(e) => setToneOfVoice(e.target.value)}
                    placeholder="Ex.: Acolhedor, técnico com simplicidade, foco em bem-estar"
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg bg-secondary hover:bg-secondary/80 text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-border">
              <div>
                <h2 className="text-xl font-bold font-display">{selectedClient.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedClient.segment || 'Segmento não informado'}</p>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Perfil de Marketing */}
            {selectedClient.profile && (
              <div className="p-4 rounded-xl bg-secondary/30 border border-border/60 space-y-2 text-xs">
                <h4 className="font-semibold text-primary uppercase tracking-wider text-[11px]">
                  Diretrizes de Comunicação
                </h4>
                {selectedClient.profile.toneOfVoice && (
                  <p><strong>Tom de Voz:</strong> {selectedClient.profile.toneOfVoice}</p>
                )}
                {selectedClient.profile.targetAudience && (
                  <p><strong>Público-Alvo:</strong> {selectedClient.profile.targetAudience}</p>
                )}
              </div>
            )}

            {/* Projetos do Cliente */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Projetos Relacionados</h3>
              {selectedClient.projects?.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedClient.projects.map((p: any) => (
                    <div key={p.id} className="p-2.5 bg-secondary/30 rounded-lg text-xs flex justify-between items-center">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">{p.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum projeto associado ainda.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
