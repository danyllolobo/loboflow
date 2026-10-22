import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import { formatDateOnly } from '../lib/date-utils';
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
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  ProjectStatus,
} from '@loboflow/shared';

export function ProjectsPage() {
  const { activeOrg } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  // Form Criar
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Form Editar
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('ACTIVE');
  const [editDueDate, setEditDueDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  // Tecla ESC para fechar modais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNewModalOpen(false);
        setEditingProject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const handleOpenEdit = (proj: any) => {
    setEditingProject(proj);
    setEditName(proj.name);
    setEditDesc(proj.description || '');
    setEditClientId(proj.clientId || '');
    setEditStatus(proj.status);
    setEditDueDate(proj.dueDate ? proj.dueDate.slice(0, 10) : '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editName.trim()) return;

    try {
      setIsSavingEdit(true);
      await api.patch(`/projects/${editingProject.id}`, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        clientId: editClientId || null,
        status: editStatus,
        dueDate: editDueDate || null,
      });
      setEditingProject(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar projeto');
    } finally {
      setIsSavingEdit(false);
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
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-all shadow-md cursor-pointer"
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
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg"
          >
            Começar Agora
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="bg-card border border-border rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group double-bezel relative"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    {proj.client ? (
                      <span className="text-xs font-bold text-primary truncate flex items-center gap-1">
                        <Users2 className="h-3 w-3 shrink-0" />
                        {proj.client.name}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Interno</span>
                    )}

                    <span className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-0.5 bg-secondary/80 rounded-md">
                      {PROJECT_STATUS_LABELS[proj.status as ProjectStatus] || proj.status}
                    </span>
                  </div>

                  {/* Botão Editar Projeto */}
                  <button
                    onClick={() => handleOpenEdit(proj)}
                    className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    title="Editar Projeto"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors break-words">
                  {proj.name}
                </h3>

                {proj.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 break-words">
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
                      {formatDateOnly(proj.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Projeto com Backdrop Click */}
      {newModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 double-bezel">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display">Criar Novo Projeto</h2>
              <button
                onClick={() => setNewModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome do Projeto *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: Campanha Lançamento 2026"
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Descrição do Escopo</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivos e entregáveis do projeto..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Cliente Vinculado</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="">Interno (Sem cliente)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Prazo de Conclusão</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
                >
                  Salvar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Projeto com Backdrop Click */}
      {editingProject && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingProject(null);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 double-bezel">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display">Editar Projeto</h2>
              <button
                onClick={() => setEditingProject(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nome do Projeto *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Cliente Vinculado</label>
                  <select
                    value={editClientId}
                    onChange={(e) => setEditClientId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="">Interno (Sem cliente)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Status do Projeto</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none cursor-pointer"
                  >
                    {PROJECT_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {PROJECT_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Prazo de Conclusão</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer disabled:opacity-50"
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
