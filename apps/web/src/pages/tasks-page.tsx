import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import {
  Kanban,
  List,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  MessageSquare,
  CheckSquare,
  ArrowUpDown,
} from 'lucide-react';
import { TASK_PRIORITY_LABELS, TaskPriority } from '@loboflow/shared';

export function TasksPage() {
  const { activeOrg } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterView, setFilterView] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

  // Formulário Nova Tarefa
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState('');
  const [newStatusId, setNewStatusId] = useState('');

  // Comentários & Checklist no Modal de Detalhes
  const [commentText, setCommentText] = useState('');
  const [checklistText, setChecklistText] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, statusesRes]: [any, any] = await Promise.all([
        api.get(`/tasks?view=${filterView}&q=${encodeURIComponent(search)}&pageSize=100`),
        api.get('/tasks/statuses'),
      ]);
      setTasks(tasksRes.items || []);
      setStatuses(statusesRes || []);
      if (statusesRes?.length > 0 && !newStatusId) {
        setNewStatusId(statusesRes[0].id);
      }
    } catch (err) {
      console.error('Falha ao carregar tarefas', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeOrg?.organizationId, filterView]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await api.post('/tasks', {
        title: newTitle,
        description: newDesc || undefined,
        priority: newPriority,
        dueDate: newDueDate || undefined,
        statusId: newStatusId || undefined,
      });
      setNewTitle('');
      setNewDesc('');
      setNewDueDate('');
      setNewModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar tarefa');
    }
  };

  const handleMoveStatus = async (taskId: string, targetStatusId: string) => {
    try {
      await api.post(`/tasks/${taskId}/move`, { statusId: targetStatusId });
      loadData();
      if (selectedTask?.id === taskId) {
        const updated = await api.get(`/tasks/${taskId}`);
        setSelectedTask(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao mover tarefa');
    }
  };

  const handleOpenDetail = async (id: string) => {
    try {
      const task = await api.get(`/tasks/${id}`);
      setSelectedTask(task);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    try {
      await api.post(`/tasks/${selectedTask.id}/comments`, { body: commentText });
      setCommentText('');
      const updated = await api.get(`/tasks/${selectedTask.id}`);
      setSelectedTask(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistText.trim() || !selectedTask) return;

    try {
      await api.post(`/tasks/${selectedTask.id}/checklist`, { title: checklistText });
      setChecklistText('');
      const updated = await api.get(`/tasks/${selectedTask.id}`);
      setSelectedTask(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleChecklist = async (itemId: string, done: boolean) => {
    if (!selectedTask) return;
    try {
      await api.patch(`/tasks/${selectedTask.id}/checklist/${itemId}`, { done });
      const updated = await api.get(`/tasks/${selectedTask.id}`);
      setSelectedTask(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return <span className="bg-rose-500/10 text-rose-500 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Urgente</span>;
      case 'HIGH':
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">Alta</span>;
      case 'MEDIUM':
        return <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">Média</span>;
      case 'LOW':
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/30 text-[10px] font-semibold px-2 py-0.5 rounded uppercase">Baixa</span>;
    }
  };

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Tarefas da Organização
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fluxo Kanban e Lista com controle de status, prazos e checklists.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de visualização */}
          <div className="flex bg-secondary p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'kanban'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" /> Lista
            </button>
          </div>

          <button
            onClick={() => setNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Criar Tarefa
          </button>
        </div>
      </div>

      {/* Barra de Filtros Rápidos */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'mine', label: 'Minhas Tarefas' },
            { id: 'overdue', label: 'Atrasadas' },
            { id: 'unassigned', label: 'Sem Responsável' },
            { id: 'upcoming', label: 'Próximas Entregas' },
            { id: 'completed', label: 'Concluídas' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterView(f.id)}
              className={`px-3 py-1 text-xs rounded-full transition-all font-medium ${
                filterView === f.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            placeholder="Buscar por título..."
            className="w-full bg-secondary/40 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Conteúdo: Kanban ou Lista */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          <Clock className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando tarefas...
        </div>
      ) : viewMode === 'kanban' ? (
        /* Visualização KANBAN */
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max h-full">
            {statuses.map((status) => {
              const columnTasks = tasks.filter((t) => t.statusId === status.id);
              return (
                <div
                  key={status.id}
                  className="w-80 flex flex-col bg-secondary/20 rounded-xl border border-border/80 p-3 max-h-[calc(100vh-250px)]"
                >
                  {/* Cabeçalho da Coluna */}
                  <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="font-semibold text-xs text-foreground truncate">
                        {status.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Cards da Coluna */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {columnTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handleOpenDetail(task.id)}
                        className="bg-card hover:border-primary/50 border border-border/80 rounded-xl p-3 shadow-sm cursor-pointer transition-all hover:shadow-md space-y-2.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-muted-foreground font-semibold">
                            #{task.number}
                          </span>
                          {getPriorityBadge(task.priority)}
                        </div>

                        <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">
                          {task.title}
                        </div>

                        {task.project && (
                          <div className="text-[11px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded font-medium inline-block truncate max-w-full">
                            {task.project.name}
                          </div>
                        )}

                        <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                          {task.dueDate ? (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                            </span>
                          ) : (
                            <span />
                          )}

                          <div className="flex items-center gap-2">
                            {task._count?.comments > 0 && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <MessageSquare className="h-3 w-3" />
                                {task._count.comments}
                              </span>
                            )}
                            {task._count?.checklist > 0 && (
                              <span className="flex items-center gap-1 text-[11px]">
                                <CheckSquare className="h-3 w-3" />
                                {task._count.checklist}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Visualização em LISTA */
        <div className="flex-1 overflow-y-auto bg-card rounded-xl border border-border shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase border-b border-border">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Título</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">Projeto</th>
                <th className="py-3 px-4">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => handleOpenDetail(task.id)}
                  className="hover:bg-secondary/30 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                    #{task.number}
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground hover:text-primary">
                    {task.title}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${task.status?.color}20`,
                        color: task.status?.color,
                      }}
                    >
                      {task.status?.name}
                    </span>
                  </td>
                  <td className="py-3 px-4">{getPriorityBadge(task.priority)}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {task.project?.name || '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nova Tarefa */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-lg font-bold font-display">Criar Nova Tarefa</h2>
              <button
                onClick={() => setNewModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">Título da Tarefa *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex.: Desenvolver criativos da campanha de tráfego"
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Instruções, links ou particularidades da demanda..."
                  className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Prioridade</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Status Inicial</label>
                  <select
                    value={newStatusId}
                    onChange={(e) => setNewStatusId(e.target.value)}
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">Prazo de Entrega</label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
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
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Drawer: Detalhes da Tarefa com Comentários e Checklist */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-muted-foreground">
                  #{selectedTask.number}
                </span>
                <span className="text-base font-bold truncate max-w-md">
                  {selectedTask.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Mudar Status Rápido */}
              <div className="flex items-center justify-between bg-secondary/30 p-3 rounded-xl border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">Status Atual:</span>
                  <select
                    value={selectedTask.statusId}
                    onChange={(e) => handleMoveStatus(selectedTask.id, e.target.value)}
                    className="bg-card border border-border text-xs rounded-lg px-2.5 py-1 font-semibold"
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>{getPriorityBadge(selectedTask.priority)}</div>
              </div>

              {/* Descrição */}
              {selectedTask.description && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                    Descrição
                  </h3>
                  <div className="text-sm bg-secondary/20 p-3 rounded-lg border border-border/50 whitespace-pre-wrap">
                    {selectedTask.description}
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-primary" /> Checklist de Subtarefas
                </h3>

                <div className="space-y-1.5 mb-3">
                  {selectedTask.checklist?.map((item: any) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2.5 p-2 bg-secondary/30 rounded-lg hover:bg-secondary/50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(e) => handleToggleChecklist(item.id, e.target.checked)}
                        className="rounded border-border text-primary focus:ring-0"
                      />
                      <span className={item.done ? 'line-through text-muted-foreground' : ''}>
                        {item.title}
                      </span>
                    </label>
                  ))}
                </div>

                <form onSubmit={handleAddChecklist} className="flex gap-2">
                  <input
                    type="text"
                    value={checklistText}
                    onChange={(e) => setChecklistText(e.target.value)}
                    placeholder="Adicionar item ao checklist..."
                    className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs rounded-lg bg-secondary hover:bg-secondary/80 font-medium"
                  >
                    Adicionar
                  </button>
                </form>
              </div>

              {/* Comentários */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-sky-400" /> Comentários e Histórico
                </h3>

                <div className="space-y-3 mb-3">
                  {selectedTask.comments?.map((c: any) => (
                    <div key={c.id} className="p-3 bg-secondary/30 rounded-xl border border-border/60 text-xs">
                      <div className="flex justify-between items-center mb-1 text-muted-foreground">
                        <span className="font-semibold text-foreground">{c.author?.name || 'Membro'}</span>
                        <span>{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm">{c.body}</div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escreva um comentário ou atualização..."
                    className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
