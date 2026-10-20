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
  User,
  FolderKanban,
  Users2,
  Tag,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { TASK_PRIORITY_LABELS, TaskPriority } from '@loboflow/shared';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

interface DraggableTaskCardProps {
  task: any;
  onOpenDetail: (id: string) => void;
  getPriorityBadge: (p: TaskPriority) => React.ReactNode;
}

function DraggableTaskCard({ task, onOpenDetail, getPriorityBadge }: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style: React.CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpenDetail(task.id)}
      className={`bg-card hover:border-primary/50 border border-border rounded-xl p-3.5 shadow-sm cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md space-y-3 group double-bezel select-none ${
        isDragging ? 'opacity-70 ring-2 ring-primary shadow-xl rotate-1 scale-[1.02]' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground font-bold">
          #{task.number}
        </span>
        {getPriorityBadge(task.priority)}
      </div>

      <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
        {task.title}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {task.project && (
          <div className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium border border-border truncate max-w-full flex items-center gap-1">
            <FolderKanban className="h-2.5 w-2.5" />
            <span className="truncate">{task.project.name}</span>
          </div>
        )}
        {task.client && (
          <div className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium border border-border truncate max-w-full flex items-center gap-1">
            <Users2 className="h-2.5 w-2.5" />
            <span className="truncate">{task.client.name}</span>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
        {task.dueDate ? (
          <span className="flex items-center gap-1 text-[11px] font-medium">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {new Date(task.dueDate).toLocaleDateString('pt-BR')}
          </span>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2.5">
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
  );
}

interface DroppableColumnProps {
  status: any;
  tasks: any[];
  onOpenDetail: (id: string) => void;
  getPriorityBadge: (p: TaskPriority) => React.ReactNode;
}

function DroppableColumn({
  status,
  tasks,
  onOpenDetail,
  getPriorityBadge,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-80 flex flex-col rounded-2xl border transition-all duration-200 p-3.5 max-h-[calc(100vh-250px)] ${
        isOver
          ? 'bg-primary/10 border-primary ring-2 ring-primary/20 shadow-md'
          : 'bg-secondary/30 border-border/80'
      }`}
    >
      {/* Cabeçalho da Coluna */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: status.color }}
          />
          <span className="font-bold text-xs text-foreground uppercase tracking-wide truncate">
            {status.name}
          </span>
        </div>
        <span className="text-xs font-mono font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border/60">
          {tasks.length}
        </span>
      </div>

      {/* Cards da Coluna */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[120px]">
        {tasks.map((task) => (
          <DraggableTaskCard
            key={task.id}
            task={task}
            onOpenDetail={onOpenDetail}
            getPriorityBadge={getPriorityBadge}
          />
        ))}
        {tasks.length === 0 && (
          <div className="h-24 rounded-xl border border-dashed border-border/50 flex items-center justify-center text-xs text-muted-foreground/60">
            Arraste uma tarefa aqui
          </div>
        )}
      </div>
    </div>
  );
}

export function TasksPage() {
  const { activeOrg } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
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
  const [newProjectId, setNewProjectId] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');

  // Comentários & Checklist no Modal de Detalhes
  const [commentText, setCommentText] = useState('');
  const [checklistText, setChecklistText] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, statusesRes, projectsRes, clientsRes, membersRes]: [any, any, any, any, any] =
        await Promise.all([
          api.get(`/tasks?view=${filterView}&q=${encodeURIComponent(search)}&pageSize=100`),
          api.get('/tasks/statuses'),
          api.get('/projects').catch(() => []),
          api.get('/clients').catch(() => []),
          api.get('/organizations/current/members').catch(() => []),
        ]);

      setTasks(tasksRes.items || []);
      setStatuses(statusesRes || []);
      setProjects(Array.isArray(projectsRes) ? projectsRes : []);
      setClients(Array.isArray(clientsRes) ? clientsRes : []);
      setMembers(Array.isArray(membersRes) ? membersRes : []);

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
        projectId: newProjectId || undefined,
        clientId: newClientId || undefined,
        assigneeIds: newAssigneeId ? [newAssigneeId] : undefined,
      });

      // Limpa o formulário
      setNewTitle('');
      setNewDesc('');
      setNewDueDate('');
      setNewProjectId('');
      setNewClientId('');
      setNewAssigneeId('');
      setNewModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar tarefa');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const targetStatusId = String(over.id);

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.statusId === targetStatusId) return;

    // Atualização otimista imediata na UI
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, statusId: targetStatusId } : t)),
    );

    try {
      await api.post(`/tasks/${taskId}/move`, { statusId: targetStatusId });
    } catch (err: any) {
      console.error('Falha ao mover tarefa via arrastar e soltar', err);
      loadData();
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
      alert(err.message || 'Erro ao adicionar comentário');
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
      alert(err.message || 'Erro ao adicionar item no checklist');
    }
  };

  const handleToggleChecklist = async (itemId: string, done: boolean) => {
    if (!selectedTask) return;
    try {
      await api.patch(`/tasks/${selectedTask.id}/checklist/${itemId}`, { done });
      const updated = await api.get(`/tasks/${selectedTask.id}`);
      setSelectedTask(updated);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar checklist');
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return (
          <span className="bg-rose-500/10 text-rose-500 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
            <Flame className="h-2.5 w-2.5" /> Urgente
          </span>
        );
      case 'HIGH':
        return (
          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
            Alta
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
            Média
          </span>
        );
      case 'LOW':
        return (
          <span className="bg-slate-500/10 text-slate-400 border border-slate-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase">
            Baixa
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-border/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
            Tarefas da Organização
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Fluxo Kanban e Lista com controle de status, responsáveis, projetos e checklists.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Seletor de visualização */}
          <div className="flex bg-secondary p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-md hover:shadow-primary/25 cursor-pointer"
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
              className={`px-3.5 py-1.5 text-xs rounded-xl transition-all font-semibold cursor-pointer ${
                filterView === f.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px] w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            placeholder="Buscar por demanda ou tag..."
            className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm"
          />
        </div>
      </div>

      {/* Conteúdo: Kanban ou Lista */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm min-h-[300px]">
          <Clock className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando tarefas do LoboFlow...
        </div>
      ) : viewMode === 'kanban' ? (
        /* Visualização KANBAN com Drag-and-Drop fluido */
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max h-full">
              {statuses.map((status) => (
                <DroppableColumn
                  key={status.id}
                  status={status}
                  tasks={tasks.filter((t) => t.statusId === status.id)}
                  onOpenDetail={handleOpenDetail}
                  getPriorityBadge={getPriorityBadge}
                />
              ))}
            </div>
          </div>
        </DndContext>
      ) : (
        /* Visualização em LISTA */
        <div className="flex-1 overflow-y-auto bg-card rounded-2xl border border-border shadow-sm double-bezel">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase border-b border-border">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Título</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Prioridade</th>
                <th className="py-3 px-4">Projeto / Cliente</th>
                <th className="py-3 px-4">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => handleOpenDetail(task.id)}
                  className="hover:bg-secondary/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground font-bold">
                    #{task.number}
                  </td>
                  <td className="py-3 px-4 font-semibold text-foreground hover:text-primary">
                    {task.title}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                      style={{
                        backgroundColor: `${task.status?.color}20`,
                        color: task.status?.color,
                        border: `1px solid ${task.status?.color}40`,
                      }}
                    >
                      {task.status?.name}
                    </span>
                  </td>
                  <td className="py-3 px-4">{getPriorityBadge(task.priority)}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {task.project?.name || task.client?.name || '—'}
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

      {/* Modal: Nova Tarefa (Alto Contraste & Seletores Completos) */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card text-foreground border border-border rounded-3xl w-full max-w-xl p-6 sm:p-7 shadow-2xl double-bezel space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-border">
              <div>
                <h2 className="text-lg font-bold font-display text-foreground">Criar Nova Tarefa</h2>
                <p className="text-xs text-muted-foreground">
                  Cadastre uma demanda vinculada ao fluxo da {activeOrg?.organizationName}
                </p>
              </div>
              <button
                onClick={() => setNewModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-foreground">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex.: Desenvolver criativos da campanha de tráfego pago"
                  className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm placeholder:text-muted-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-foreground">
                  Descrição e Orientações
                </label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Instruções da demanda, links de referência, objetivos..."
                  className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm placeholder:text-muted-foreground"
                />
              </div>

              {/* Grid: Projeto e Cliente */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-foreground">
                    Projeto Vinculado
                  </label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
                  >
                    <option value="">Nenhum projeto vinculado</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-foreground">
                    Cliente Vinculado
                  </label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
                  >
                    <option value="">Nenhum cliente vinculado</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grid: Responsável, Prioridade e Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-foreground">
                    Responsável
                  </label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
                  >
                    <option value="">Sem responsável</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user?.name || m.user?.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-foreground">
                    Prioridade
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-foreground">
                    Status Inicial
                  </label>
                  <select
                    value={newStatusId}
                    onChange={(e) => setNewStatusId(e.target.value)}
                    className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
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
                <label className="block text-xs font-semibold mb-1.5 text-foreground">
                  Prazo Limite de Entrega
                </label>
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-primary/25 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card text-foreground border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl double-bezel">
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">
                  #{selectedTask.number}
                </span>
                <span className="text-base font-bold truncate max-w-md">
                  {selectedTask.title}
                </span>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Barra de Status e Prioridade */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/40 p-3.5 rounded-2xl border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Status Atual:</span>
                  <select
                    value={selectedTask.statusId}
                    onChange={(e) => handleMoveStatus(selectedTask.id, e.target.value)}
                    className="bg-card border border-border text-foreground text-xs font-bold rounded-xl px-3 py-1.5 shadow-sm cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
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

              {/* Informações de Projeto, Cliente e Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                    Projeto
                  </span>
                  <span className="font-semibold text-foreground truncate block mt-0.5">
                    {selectedTask.project?.name || 'Não vinculado'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                    Cliente
                  </span>
                  <span className="font-semibold text-foreground truncate block mt-0.5">
                    {selectedTask.client?.name || 'Não vinculado'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/60">
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                    Prazo Limite
                  </span>
                  <span className="font-semibold text-foreground block mt-0.5">
                    {selectedTask.dueDate
                      ? new Date(selectedTask.dueDate).toLocaleDateString('pt-BR')
                      : 'Sem prazo definido'}
                  </span>
                </div>
              </div>

              {/* Descrição */}
              {selectedTask.description && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Descrição
                  </h3>
                  <div className="text-sm bg-background p-4 rounded-xl border border-border whitespace-pre-wrap leading-relaxed shadow-sm">
                    {selectedTask.description}
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-primary" /> Checklist de Subtarefas
                </h3>

                <div className="space-y-1.5">
                  {selectedTask.checklist?.map((item: any) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-2.5 bg-background border border-border/60 rounded-xl hover:bg-secondary/40 cursor-pointer text-xs transition-colors shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(e) => handleToggleChecklist(item.id, e.target.checked)}
                        className="rounded border-border text-primary focus:ring-0 cursor-pointer"
                      />
                      <span className={item.done ? 'line-through text-muted-foreground' : 'font-medium'}>
                        {item.title}
                      </span>
                    </label>
                  ))}
                </div>

                <form onSubmit={handleAddChecklist} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={checklistText}
                    onChange={(e) => setChecklistText(e.target.value)}
                    placeholder="Adicionar subitem ao checklist..."
                    className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-semibold cursor-pointer border border-border"
                  >
                    Adicionar
                  </button>
                </form>
              </div>

              {/* Comentários */}
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-sky-400" /> Comentários da Demanda
                </h3>

                <div className="space-y-2.5 max-h-48 overflow-y-auto">
                  {selectedTask.comments?.map((c: any) => (
                    <div key={c.id} className="p-3.5 bg-background rounded-xl border border-border text-xs space-y-1 shadow-sm">
                      <div className="flex justify-between items-center text-muted-foreground">
                        <span className="font-bold text-foreground">{c.author?.name || 'Membro'}</span>
                        <span className="text-[10px]">{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{c.body}</div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escreva uma orientação ou atualização..."
                    className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow cursor-pointer"
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
