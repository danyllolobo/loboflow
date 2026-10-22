import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import {
  Kanban,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Clock,
  X,
  Edit3,
  Trash2,
  Calendar,
} from 'lucide-react';
import { TaskPriority } from '@loboflow/shared';
import {
  DndContext,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { TaskCard } from '../components/tasks/task-card';
import { QuickTaskInput } from '../components/tasks/quick-task-input';
import { TaskDrawer } from '../components/tasks/task-drawer';
import { formatDateOnly } from '../lib/date-utils';
import { TaskPriorityIcon } from '../components/tasks/task-priority-icon';

function DroppableColumn({
  status,
  tasks,
  onOpenDetail,
  onQuickCreate,
}: {
  status: any;
  tasks: any[];
  onOpenDetail: (id: string) => void;
  onQuickCreate: (title: string, statusId: string) => Promise<void>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-76 flex flex-col rounded-xl border transition-all duration-150 p-2.5 max-h-[calc(100vh-210px)] shrink-0 ${
        isOver
          ? 'bg-primary/5 border-primary ring-1 ring-primary/30'
          : 'bg-secondary/25 border-border/70 hover:border-border'
      }`}
    >
      {/* Cabeçalho da Coluna */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60 px-1">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: status.color || '#3b82f6' }}
          />
          <span className="font-semibold text-xs text-foreground uppercase tracking-wide truncate">
            {status.name}
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.2 rounded font-medium border border-border/60">
          {tasks.length}
        </span>
      </div>

      {/* Input de Criação Rápida Inline no Topo */}
      <div className="mb-2">
        <QuickTaskInput statusId={status.id} onCreate={onQuickCreate} />
      </div>

      {/* Lista de Cards da Coluna */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-[100px]">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onOpenDetail={onOpenDetail} />
        ))}
        {tasks.length === 0 && (
          <div className="h-20 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-[11px] text-muted-foreground/60 select-none">
            Sem demandas nesta etapa
          </div>
        )}
      </div>
    </div>
  );
}

export function TasksPage() {
  const { activeOrg } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterView, setFilterView] = useState('all');
  const [search, setSearch] = useState('');

  // Drawer de Detalhes
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Modal de Criação Completa
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newDueDate, setNewDueDate] = useState('');
  const [newStatusId, setNewStatusId] = useState('');
  const [newProjectId, setNewProjectId] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newAssigneeId, setNewAssigneeId] = useState('');

  // Modal de Personalização de Colunas
  const [columnsModalOpen, setColumnsModalOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
  const [isSavingColumn, setIsSavingColumn] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editStatusName, setEditStatusName] = useState('');
  const [editStatusColor, setEditStatusColor] = useState('#3b82f6');
  const [isSavingStatusEdit, setIsSavingStatusEdit] = useState(false);

  // DnD Active State
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const availableProjectsForNew = newClientId
    ? projects.filter((p) => p.clientId === newClientId)
    : projects;

  const handleNewClientChange = (selectedClientId: string) => {
    setNewClientId(selectedClientId);
    if (selectedClientId) {
      const currentProj = projects.find((p) => p.id === newProjectId);
      if (currentProj && currentProj.clientId !== selectedClientId) {
        setNewProjectId('');
      }
    } else {
      const currentProj = projects.find((p) => p.id === newProjectId);
      if (currentProj?.clientId) {
        setNewProjectId('');
      }
    }
  };

  const handleNewProjectChange = (selectedProjectId: string) => {
    setNewProjectId(selectedProjectId);
    if (selectedProjectId) {
      const proj = projects.find((p) => p.id === selectedProjectId);
      if (proj?.clientId) {
        setNewClientId(proj.clientId);
      }
    }
  };

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

  // Se a URL tiver ?create=true, abre o modal de criação imediatamente
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setNewModalOpen(true);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  // Atalhos de teclado (C = criar tarefa)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora atalhos se o foco estiver num input ou textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        setNewModalOpen(true);
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
    } catch (err) {
      console.error('Falha ao mover tarefa', err);
      loadData();
    }
  };

  const handleQuickCreate = async (title: string, statusId: string) => {
    try {
      await api.post('/tasks', {
        title,
        statusId,
        priority: 'MEDIUM',
      });
      loadData();
    } catch (err) {
      console.error('Falha ao criar tarefa rápida', err);
    }
  };

  const handleCreateTaskFull = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await api.post('/tasks', {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        priority: newPriority,
        dueDate: newDueDate || undefined,
        statusId: newStatusId || undefined,
        projectId: newProjectId || undefined,
        clientId: newClientId || undefined,
        assigneeIds: newAssigneeId ? [newAssigneeId] : undefined,
      });

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

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente excluir esta demanda?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir demanda');
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Top Header & Controles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/70">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
            Tarefas
          </h1>
          <p className="text-xs text-muted-foreground">
            Gerenciamento de tempo, entregas e demandas da {activeOrg?.organizationName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador Kanban / Lista */}
          <div className="flex bg-secondary/80 p-0.5 rounded-lg border border-border/80 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-card text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-2xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Gerenciar Colunas */}
          <button
            onClick={() => setColumnsModalOpen(true)}
            className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-secondary/70 hover:bg-secondary border border-border text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Personalizar Colunas"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Colunas</span>
          </button>

          {/* Nova Tarefa Completa */}
          <button
            onClick={() => setNewModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nova Tarefa</span>
            <kbd className="hidden lg:inline text-[9px] bg-primary-foreground/20 px-1 rounded font-mono ml-0.5">
              C
            </kbd>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Rápidos & Busca */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'mine', label: 'Minhas' },
            { id: 'overdue', label: 'Atrasadas' },
            { id: 'unassigned', label: 'Sem Responsável' },
            { id: 'upcoming', label: 'Próximos 7 dias' },
            { id: 'completed', label: 'Concluídas' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterView(f.id)}
              className={`px-2.5 py-1 text-xs rounded-lg transition-colors font-medium cursor-pointer ${
                filterView === f.id
                  ? 'bg-primary/10 text-primary font-semibold border border-primary/20'
                  : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] w-full sm:w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            placeholder="Filtrar demandas..."
            className="w-full bg-background border border-border/80 rounded-lg pl-8 pr-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
          />
        </div>
      </div>

      {/* Conteúdo: Kanban ou Lista */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs min-h-[300px]">
          <Clock className="h-4 w-4 animate-spin mr-2 text-primary" /> Carregando fluxo de tarefas...
        </div>
      ) : viewMode === 'kanban' ? (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveTaskId(null)}
        >
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max h-full items-start">
              {statuses.map((status) => (
                <DroppableColumn
                  key={status.id}
                  status={status}
                  tasks={tasks.filter((t) => t.statusId === status.id)}
                  onOpenDetail={(id) => setSelectedTaskId(id)}
                  onQuickCreate={handleQuickCreate}
                />
              ))}
            </div>
          </div>

          {/* Drag Overlay visual fluido */}
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeTask ? (
              <div className="w-76 rotate-2 scale-105 pointer-events-none opacity-90 shadow-2xl">
                <TaskCard task={activeTask} onOpenDetail={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* Visualização em Lista Linear Clean */
        <div className="flex-1 overflow-y-auto bg-card rounded-xl border border-border/80 shadow-2xs">
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground text-[11px] uppercase border-b border-border/80">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">Demanda</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 font-semibold">Prioridade</th>
                  <th className="py-2.5 px-3 font-semibold">Projeto / Cliente</th>
                  <th className="py-2.5 px-3 font-semibold">Prazo</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="hover:bg-secondary/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-3 font-mono text-muted-foreground font-semibold">
                      #{task.number}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-foreground hover:text-primary max-w-md break-words">
                      {task.title}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase"
                        style={{
                          backgroundColor: `${task.status?.color}15`,
                          color: task.status?.color,
                          border: `1px solid ${task.status?.color}30`,
                        }}
                      >
                        {task.status?.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <TaskPriorityIcon priority={task.priority} showLabel />
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {task.project?.name || task.client?.name || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                      {task.dueDate ? formatDateOnly(task.dueDate) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTask(task.id, e)}
                        className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Excluir demanda"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {tasks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Nenhuma tarefa encontrada para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer Lateral de Detalhes da Tarefa */}
      {selectedTaskId && (
        <TaskDrawer
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={loadData}
          statuses={statuses}
          projects={projects}
          clients={clients}
          members={members}
        />
      )}

      {/* Modal: Nova Tarefa Completa */}
      {newModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setNewModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
        >
          <div className="bg-card text-foreground border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">Nova Demanda</h2>
                <p className="text-xs text-muted-foreground">Cadastre e atribua uma tarefa para a equipe</p>
              </div>
              <button
                onClick={() => setNewModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskFull} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Título *</label>
                <input
                  type="text"
                  required
                  placeholder="O que deve ser entregue?"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Descrição</label>
                <textarea
                  rows={3}
                  placeholder="Contexto, links ou instruções de execução..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Prioridade</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="LOW">Baixa</option>
                    <option value="MEDIUM">Média</option>
                    <option value="HIGH">Alta</option>
                    <option value="URGENT">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Status Inicial</label>
                  <select
                    value={newStatusId}
                    onChange={(e) => setNewStatusId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Projeto</label>
                  <select
                    value={newProjectId}
                    onChange={(e) => handleNewProjectChange(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                  >
                    <option value="">Nenhum</option>
                    {availableProjectsForNew.length === 0 && newClientId ? (
                      <option value="" disabled>
                        Nenhum projeto para este cliente
                      </option>
                    ) : (
                      availableProjectsForNew.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Cliente</label>
                  <select
                    value={newClientId}
                    onChange={(e) => handleNewClientChange(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Responsável</label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="">Não atribuído</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user?.name || m.user?.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">Prazo de Entrega</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Personalizar Colunas do Kanban */}
      {columnsModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setColumnsModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
        >
          <div className="bg-card text-foreground border border-border rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground">Colunas do Kanban</h2>
                <p className="text-xs text-muted-foreground">Etapas da sua esteira de produção</p>
              </div>
              <button
                onClick={() => setColumnsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Lista das Colunas */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {statuses.map((st) => {
                const count = tasks.filter((t) => t.statusId === st.id).length;
                const isEditingThis = editingStatusId === st.id;

                if (isEditingThis) {
                  return (
                    <div key={st.id} className="p-2 rounded-lg bg-secondary/50 border border-primary/40 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editStatusName}
                          onChange={(e) => setEditStatusName(e.target.value)}
                          className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="color"
                          value={editStatusColor}
                          onChange={(e) => setEditStatusColor(e.target.value)}
                          className="h-6 w-6 rounded cursor-pointer border border-border p-0"
                        />
                      </div>
                      <div className="flex justify-end gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => setEditingStatusId(null)}
                          className="px-2 py-0.5 rounded bg-secondary text-muted-foreground hover:text-foreground"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isSavingStatusEdit || !editStatusName.trim()}
                          onClick={() => handleSaveStatusEdit(st.id)}
                          className="px-2.5 py-0.5 rounded font-semibold bg-primary text-primary-foreground disabled:opacity-50"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/70 hover:border-border transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: st.color }}
                      />
                      <span className="font-semibold text-foreground">{st.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        {count}
                      </span>
                      <button
                        onClick={() => {
                          setEditingStatusId(st.id);
                          setEditStatusName(st.name);
                          setEditStatusColor(st.color || '#3b82f6');
                        }}
                        className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                        title="Editar coluna"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      {count === 0 && statuses.length > 2 && (
                        <button
                          onClick={() => handleDeleteColumn(st.id)}
                          className="p-1 rounded text-muted-foreground hover:text-rose-500 transition-colors"
                          title="Excluir coluna"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Adicionar Coluna */}
            <form onSubmit={handleCreateColumn} className="p-2.5 rounded-xl bg-secondary/20 border border-border/80 flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="Nova etapa..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <input
                type="color"
                value={newColumnColor}
                onChange={(e) => setNewColumnColor(e.target.value)}
                className="h-7 w-7 rounded cursor-pointer border border-border p-0"
              />
              <button
                type="submit"
                disabled={isSavingColumn || !newColumnName.trim()}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 shrink-0"
              >
                Adicionar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
