import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import {
  FolderKanban,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  X,
  User,
  Users2,
  TrendingUp,
} from 'lucide-react';
import { PROJECT_STATUS_LABELS, ProjectStatus } from '@loboflow/shared';

export function ProjectsPage() {
  const { activeOrg } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [projRes, clientsRes]: [any, any] = await Promise.all([
        api.get('/projects'),
        api.get('/clients'),
      ]);
      setProjects(projRes || []);
      setClients(clientsRes || []);
    } catch (err) {
      console.error('Falha ao carregar projetos', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg?.organizationId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await api.post('/projects', {
        name,
        description: description || undefined,
        clientId: clientId || undefined,
        dueDate: dueDate || undefined,
      });
      setName('');
      setDescription('');
      setClientId('');
      setDueDate('');
      setNewModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar projeto');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Projetos da Organização
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe o progresso das entregas, clientes e equipes envolvidas.
          </p>
        </div>

        <button
          onClick={() => setNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo Projeto
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          <Clock className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando projetos...
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-secondary/20 max-w-md mx-auto my-8">
          <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-sm">Nenhum projeto cadastrado</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Crie seu primeiro projeto para organizar tarefas em metas estruturadas.
          </p>
          <button
            onClick={() => setNewModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground"
          >
            Criar Primeiro Projeto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-card border border-border/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  {proj.client ? (
                    <span className="text-[11px] bg-secondary text-primary font-semibold px-2 py-0.5 rounded-full truncate max-w-[180px]">
                      {proj.client.name}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Interno</span>
                  )}

                  <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-0.5 bg-secondary/80 rounded-md">
                    {PROJECT_STATUS_LABELS[proj.status as ProjectStatus] || proj.status}
                  </span>
                </div>

                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {proj.name}
                </h3>

                {proj.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {proj.description}
                  </p>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-border/60">
                {/* Progresso Dinâmico */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">Progresso</span>
                    <span className="font-mono font-bold text-primary">{proj.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${proj.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>{proj.completedTasks} de {proj.totalTasks} tarefas</span>
                  {proj.dueDate && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="h-3 w-3" />
                      {new Date(proj.dueDate).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Projeto */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display">Criar Novo Projeto</h2>
              <button onClick={() => setNewModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Nome do Projeto *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Lançamento Linha Conforto 2026"
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Descrição do Escopo</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivos e entregáveis principais..."
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Cliente Vinculado (Opcional)</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Nenhum (Projeto Interno)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Prazo Final</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
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
                  Salvar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
