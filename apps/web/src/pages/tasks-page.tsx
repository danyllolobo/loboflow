import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import {
  Kanban,
  List,
  Plus,
  Search,
  Calendar,
  Clock,
  AlertCircle,
  X,
  MessageSquare,
  CheckSquare,
  User,
  FolderKanban,
  Users2,
  ChevronRight,
  Flame,
  Edit3,
  Trash2,
  SlidersHorizontal,
  Check,
  Save,
} from 'lucide-react';
import { TASK_PRIORITY_LABELS, TaskPriority } from '@loboflow/shared';
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

interface DraggableTaskCardProps {
  task: any;
  onOpenDetail: (id: string) => void;
  getPriorityBadge: (p: TaskPriority) => React.ReactNode;
  isDraggingThis?: boolean;
}

function DraggableTaskCard({
  task,
  onOpenDetail,
  getPriorityBadge,
}: DraggableTaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpenDetail(task.id)}
      className={`bg-card hover:border-primary/50 border border-border rounded-xl p-3.5 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md space-y-3 group double-bezel select-none ${
        isDragging
          ? 'opacity-30 border-dashed border-2 border-primary/50 scale-[0.98]'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground font-bold">
          #{task.number}
        </span>
        {getPriorityBadge(task.priority)}
      </div>

      <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-snug break-words">
        {task.title}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {task.project && (
          <div className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium border border-border truncate max-w-full flex items-center gap-1">
            <FolderKanban className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{task.project.name}</span>
          </div>
        )}
        {task.client && (
          <div className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium border border-border truncate max-w-full flex items-center gap-1">
            <Users2 className="h-2.5 w-2.5 shrink-0" />
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
          <div className="h-24 rounded-xl border border-dashed border-border/50 flex items-center justify-center text-xs text-muted-foreground/60 select-none">
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
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);

  // DnD Active State
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Formulário Nova Tarefa
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState('');
  const [newStatusId, setNewStatusId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');

  // Edição de Tarefa Selecionada
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('MEDIUM');
  const [editDueDate, setEditDueDate] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editStatusId, setEditStatusId] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Comentários & Checklist no Modal de Detalhes
  const [commentText, setCommentText] = useState('');
  const [checklistText, setChecklistText] = useState('');

  // Formulário Nova Coluna de Status
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
  const [isSavingColumn, setIsSavingColumn] = useState(false);

  // Edição de Coluna de Status Existente
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editStatusName, setEditStatusName] = useState('');
  const [editStatusColor, setEditStatusColor] = useState('#3b82f6');
  const [isSavingStatusEdit, setIsSavingStatusEdit] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, statusesRes, projectsRes, clientsRes, membersRes]: [
        any,
        any,
        any,
        any,
        any,
      ] = await Promise.all([
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

  // Tecla ESC para fechar qualquer modal aberto
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNewModalOpen(false);
        setSelectedTask(null);
        setColumnsModalOpen(false);
        setIsEditingTask(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const activeTask = useMemo(() => {
    return tasks.find((t) => t.id === activeTaskId) || null;
  }, [tasks, activeTaskId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTaskId(null);
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

  const handleOpenDetail = async (id: string) => {
    try {
      const task = await api.get<any>(`/tasks/${id}`);
      setSelectedTask(task);
      setIsEditingTask(false);
      setEditTitle(task.title);
      setEditDesc(task.description || '');
      setEditPriority(task.priority);
      setEditDueDate(task.dueDate ? task.dueDate.slice(0, 10) : '');
      setEditProjectId(task.projectId || '');
      setEditClientId(task.clientId || '');
      setEditStatusId(task.statusId || '');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEditTask = async () => {
    if (!selectedTask || !editTitle.trim()) return;

    try {
      setIsSavingEdit(true);
      await api.patch(`/tasks/${selectedTask.id}`, {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        priority: editPriority,
        dueDate: editDueDate || null,
        projectId: editProjectId || null,
        clientId: editClientId || null,
        statusId: editStatusId || undefined,
      });

      // Recarrega detalhes e lista geral
      const updated = await api.get(`/tasks/${selectedTask.id}`);
      setSelectedTask(updated);
      setIsEditingTask(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar dados da tarefa');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleArchiveTask = async () => {
    if (!selectedTask) return;
    if (!confirm('Deseja realmente arquivar esta tarefa?')) return;

    try {
      await api.post(`/tasks/${selectedTask.id}/archive`, {});
      setSelectedTask(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao arquivar tarefa');
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

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;

    try {
      await api.post(`/tasks/${selectedTask.id}/comments`, { body: commentText });
      setCommentText('');
      const updated = await api.get(`/tasks/${selectedTask.id}`);
      setSelectedTask(updated);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar comentário');
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
      alert(err.message || 'Erro ao adicionar item');
    }
  };

  const handleToggleChecklist = async (itemId: string, done: boolean) => {
    try {
      await api.patch(`/tasks/${selectedTask.id}/checklist/${itemId}`, { done });
      const updated = await api.get(`/tasks/${selectedTask.id}`);
      setSelectedTask(updated);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar checklist');
    }
  };

  // Gerenciamento de Colunas do Kanban
  const handleCreateColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;

    try {
      setIsSavingColumn(true);
      await api.post('/tasks/statuses', {
        name: newColumnName.trim(),
        color: newColumnColor,
      });
      setNewColumnName('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar nova coluna');
    } finally {
      setIsSavingColumn(false);
    }
  };

  const handleDeleteColumn = async (statusId: string) => {
    if (!confirm('Deseja excluir esta coluna?')) return;

    try {
      await api.delete(`/tasks/statuses/${statusId}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir coluna');
    }
  };

  const handleStartEditStatus = (st: any) => {
    setEditingStatusId(st.id);
    setEditStatusName(st.name);
    setEditStatusColor(st.color || '#3b82f6');
  };

  const handleSaveStatusEdit = async (stId: string) => {
    if (!editStatusName.trim()) return;
    try {
      setIsSavingStatusEdit(true);
      await api.patch(`/tasks/statuses/${stId}`, {
        name: editStatusName.trim(),
        color: editStatusColor,
      });
      setStatuses((prev) =>
        prev.map((s) => (s.id === stId ? { ...s, name: editStatusName.trim(), color: editStatusColor } : s)),
      );
      setEditingStatusId(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar coluna');
    } finally {
      setIsSavingStatusEdit(false);
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'URGENT':
        return (
          <span className="bg-rose-500/10 text-rose-500 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 shrink-0">
            <Flame className="h-2.5 w-2.5" /> Urgente
          </span>
        );
      case 'HIGH':
        return (
          <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase shrink-0">
            Alta
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase shrink-0">
            Média
          </span>
        );
      case 'LOW':
        return (
          <span className="bg-slate-500/10 text-slate-400 border border-slate-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase shrink-0">
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

        <div className="flex flex-wrap items-center gap-2">
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

          {/* Gerenciar Colunas */}
          <button
            onClick={() => setColumnsModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
            title="Personalizar Colunas do Kanban"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Colunas</span>
          </button>

          {/* Nova Tarefa */}
          <button
            onClick={() => setNewModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-primary/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Criar Tarefa
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
        /* Visualização KANBAN com Drag-and-Drop fluido e DragOverlay */
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTaskId(null)}
        >
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

          {/* DragOverlay flutuante acima de todas as pipelines */}
          <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeTask ? (
              <div className="w-80 bg-card border-2 border-primary shadow-2xl rounded-xl p-3.5 space-y-3 rotate-2 scale-105 pointer-events-none z-[9999] opacity-95">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-muted-foreground font-bold">
                    #{activeTask.number}
                  </span>
                  {getPriorityBadge(activeTask.priority)}
                </div>

                <div className="text-sm font-semibold text-foreground leading-snug break-words">
                  {activeTask.title}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {activeTask.project && (
                    <div className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium border border-border truncate max-w-full flex items-center gap-1">
                      <FolderKanban className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{activeTask.project.name}</span>
                    </div>
                  )}
                  {activeTask.client && (
                    <div className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-medium border border-border truncate max-w-full flex items-center gap-1">
                      <Users2 className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{activeTask.client.name}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  {activeTask.dueDate ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {new Date(activeTask.dueDate).toLocaleDateString('pt-BR')}
                    </span>
                  ) : (
                    <span />
                  )}

                  <div className="flex items-center gap-2.5">
                    {activeTask._count?.comments > 0 && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <MessageSquare className="h-3 w-3" />
                        {activeTask._count.comments}
                      </span>
                    )}
                    {activeTask._count?.checklist > 0 && (
                      <span className="flex items-center gap-1 text-[11px]">
                        <CheckSquare className="h-3 w-3" />
                        {activeTask._count.checklist}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* Visualização em LISTA — Responsiva com Cards em Mobile e Tabela no Desktop */
        <div className="flex-1 overflow-y-auto bg-card rounded-2xl border border-border shadow-sm double-bezel">
          {/* Versão Desktop (Tabela) */}
          <div className="hidden md:block overflow-x-auto min-w-full">
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
                    <td className="py-3 px-4 font-semibold text-foreground hover:text-primary max-w-md break-words">
                      {task.title}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase whitespace-nowrap inline-block"
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
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Versão Mobile (Cards Responsivos Elegantes) */}
          <div className="block md:hidden divide-y divide-border/60">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleOpenDetail(task.id)}
                className="p-4 space-y-2 hover:bg-secondary/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    #{task.number}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
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
                    {getPriorityBadge(task.priority)}
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-foreground leading-snug break-words">
                  {task.title}
                </h3>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span className="truncate max-w-[200px]">
                    {task.project?.name || task.client?.name || 'Sem vínculo'}
                  </span>
                  {task.dueDate && (
                    <span className="text-[11px] shrink-0 font-medium">
                      {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Nova Tarefa com Fechamento no Backdrop */}
      {newModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card text-foreground border border-border rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl double-bezel space-y-5">
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
                  Título da Demanda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Criar criativos para campanha de tráfego"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-foreground">
                  Descrição Detalhada
                </label>
                <textarea
                  rows={3}
                  placeholder="Orientações e especificações da demanda..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-background border border-border text-foreground rounded-xl p-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-foreground">
                    Projeto
                  </label>
                  <select
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
                  >
                    <option value="">Nenhum projeto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-foreground">
                    Cliente
                  </label>
                  <select
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                    className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
                  >
                    <option value="">Nenhum cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-foreground">
                  Responsável
                </label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="w-full bg-background border border-border text-foreground rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
                >
                  <option value="">Não atribuído</option>
                  {members.map((m) => (
                    <option key={m.user?.id || m.id} value={m.user?.id || m.userId}>
                      {m.user?.name || m.user?.email || 'Membro'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

      {/* Modal / Drawer: Detalhes e Edição da Tarefa */}
      {selectedTask && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedTask(null);
              setIsEditingTask(false);
            }
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card text-foreground border border-border rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl double-bezel overflow-hidden">
            {/* Header Responsivo com quebra de linha limpa e ações de edição */}
            <div className="p-4 sm:p-5 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <span className="shrink-0 font-mono text-xs sm:text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20 mt-0.5">
                  #{selectedTask.number}
                </span>
                <h2 className="text-base sm:text-lg font-bold text-foreground break-words min-w-0 flex-1 leading-snug">
                  {selectedTask.title}
                </h2>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setIsEditingTask(!isEditingTask)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isEditingTask
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-secondary text-primary'
                  }`}
                  title={isEditingTask ? 'Cancelar Edição' : 'Editar Demanda'}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={handleArchiveTask}
                  className="p-1.5 rounded-xl hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors cursor-pointer"
                  title="Arquivar / Excluir Demanda"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setIsEditingTask(false);
                  }}
                  className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Modo de Edição Ativo */}
              {isEditingTask ? (
                <div className="p-4 rounded-2xl bg-secondary/30 border border-primary/30 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Edit3 className="h-3.5 w-3.5" /> Editando Dados da Demanda
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">
                      Título da Tarefa *
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">
                      Descrição
                    </label>
                    <textarea
                      rows={3}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-foreground">
                        Prioridade
                      </label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="LOW">Baixa</option>
                        <option value="MEDIUM">Média</option>
                        <option value="HIGH">Alta</option>
                        <option value="URGENT">Urgente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-foreground">
                        Projeto
                      </label>
                      <select
                        value={editProjectId}
                        onChange={(e) => setEditProjectId(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="">Nenhum</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-foreground">
                        Cliente
                      </label>
                      <select
                        value={editClientId}
                        onChange={(e) => setEditClientId(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none cursor-pointer"
                      >
                        <option value="">Nenhum</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-foreground">
                      Prazo Limite
                    </label>
                    <input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingTask(false)}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-secondary text-foreground hover:bg-secondary/80"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isSavingEdit}
                      onClick={handleSaveEditTask}
                      className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </div>
              ) : null}

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
                  <div className="text-sm bg-background p-4 rounded-xl border border-border whitespace-pre-wrap leading-relaxed shadow-sm break-words">
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
                      <span className={item.done ? 'line-through text-muted-foreground break-words' : 'font-medium break-words'}>
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
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" /> Comentários da Demanda
                </h3>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedTask.comments?.map((c: any) => (
                    <div
                      key={c.id}
                      className="bg-background border border-border/80 rounded-xl p-3 shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-bold text-foreground">{c.author?.name}</span>
                        <span>{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">
                        {c.body}
                      </div>
                    </div>
                  ))}
                  {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      Nenhum comentário registrado.
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escreva uma orientação ou atualização..."
                    className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
                  >
                    Enviar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gerenciar Colunas do Kanban */}
      {columnsModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setColumnsModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="bg-card text-foreground border border-border rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl double-bezel space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-base sm:text-lg font-bold font-display text-foreground">
                  Personalizar Colunas do Kanban
                </h2>
                <p className="text-xs text-muted-foreground">
                  Adicione e organize os estágios do fluxo de trabalho da sua equipe.
                </p>
              </div>
              <button
                onClick={() => setColumnsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lista das Colunas Atuais */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {statuses.map((st) => {
                const count = tasks.filter((t) => t.statusId === st.id).length;
                const isEditingThis = editingStatusId === st.id;

                if (isEditingThis) {
                  return (
                    <div
                      key={st.id}
                      className="p-3 rounded-xl bg-secondary/50 border border-primary/50 space-y-2 animate-in fade-in duration-150"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editStatusName}
                          onChange={(e) => setEditStatusName(e.target.value)}
                          className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Nome da etapa..."
                        />
                        <input
                          type="color"
                          value={editStatusColor}
                          onChange={(e) => setEditStatusColor(e.target.value)}
                          className="h-7 w-7 rounded cursor-pointer border border-border bg-transparent p-0 shrink-0"
                          title="Escolha a cor da etapa"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingStatusId(null)}
                          className="px-2.5 py-1 rounded text-[11px] bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isSavingStatusEdit || !editStatusName.trim()}
                          onClick={() => handleSaveStatusEdit(st.id)}
                          className="px-3 py-1 rounded text-[11px] font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer disabled:opacity-50"
                        >
                          {isSavingStatusEdit ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-3 w-3 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: st.color }}
                      />
                      <span className="text-xs font-bold text-foreground">{st.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-md border border-border">
                        {count} tarefa(s)
                      </span>
                      <button
                        onClick={() => handleStartEditStatus(st)}
                        className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                        title="Editar nome e cor da coluna"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      {count === 0 && statuses.length > 2 && (
                        <button
                          onClick={() => handleDeleteColumn(st.id)}
                          className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Excluir coluna vazia"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formulário de Adicionar Nova Coluna */}
            <form onSubmit={handleCreateColumn} className="p-3.5 rounded-2xl bg-background border border-border space-y-3">
              <span className="text-xs font-bold text-foreground block">
                + Adicionar Nova Coluna
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nome do status (ex: Gravação, Revisão)..."
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <input
                  type="color"
                  value={newColumnColor}
                  onChange={(e) => setNewColumnColor(e.target.value)}
                  className="h-8 w-8 rounded-lg cursor-pointer border border-border bg-transparent p-0"
                  title="Escolha a cor do status"
                />
                <button
                  type="submit"
                  disabled={isSavingColumn || !newColumnName.trim()}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
