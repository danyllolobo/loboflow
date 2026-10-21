import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  FolderKanban,
  Users2,
  Trash2,
  CheckSquare,
  MessageSquare,
  Clock,
  User,
  Plus,
  Check,
  Flame,
  AlertCircle,
  Save,
} from 'lucide-react';
import { TaskPriority } from '@loboflow/shared';
import { api } from '../../lib/api';
import { TaskPriorityIcon } from './task-priority-icon';

export interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated: () => void;
  statuses: any[];
  projects: any[];
  clients: any[];
  members: any[];
}

export function TaskDrawer({
  taskId,
  onClose,
  onTaskUpdated,
  statuses,
  projects,
  clients,
  members,
}: TaskDrawerProps) {
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Campos editáveis
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [statusId, setStatusId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  // Checklist e Comentários
  const [checklistText, setChecklistText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      return;
    }

    const loadTask = async () => {
      try {
        setLoading(true);
        const res: any = await api.get(`/tasks/${taskId}`);
        setTask(res);
        setTitle(res.title || '');
        setDescription(res.description || '');
        setPriority(res.priority || 'MEDIUM');
        setStatusId(res.statusId || '');
        setProjectId(res.projectId || '');
        setClientId(res.clientId || '');
        setDueDate(res.dueDate ? res.dueDate.split('T')[0] : '');
        setAssigneeId(res.assignees?.[0]?.userId || '');
      } catch (err) {
        console.error('Falha ao carregar detalhes da tarefa', err);
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [taskId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!taskId) return null;

  const handleSaveProperties = async (updates: Partial<any>) => {
    try {
      setIsSaving(true);
      await api.patch(`/tasks/${taskId}`, updates);
      onTaskUpdated();
    } catch (err) {
      console.error('Falha ao atualizar tarefa', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleChecklist = async (itemId: string, done: boolean) => {
    try {
      await api.patch(`/tasks/${taskId}/checklist/${itemId}`, { done });
      const updatedTask = await api.get(`/tasks/${taskId}`);
      setTask(updatedTask);
      onTaskUpdated();
    } catch (err) {
      console.error('Falha ao alternar checklist', err);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistText.trim()) return;

    try {
      await api.post(`/tasks/${taskId}/checklist`, { title: checklistText.trim() });
      setChecklistText('');
      const updatedTask = await api.get(`/tasks/${taskId}`);
      setTask(updatedTask);
      onTaskUpdated();
    } catch (err) {
      console.error('Falha ao adicionar checklist', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await api.post(`/tasks/${taskId}/comments`, { body: commentText.trim() });
      setCommentText('');
      const updatedTask = await api.get(`/tasks/${taskId}`);
      setTask(updatedTask);
      onTaskUpdated();
    } catch (err) {
      console.error('Falha ao adicionar comentário', err);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Deseja realmente arquivar esta tarefa?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      onTaskUpdated();
      onClose();
    } catch (err) {
      console.error('Falha ao arquivar tarefa', err);
    }
  };

  const checklistItems = task?.checklist || [];
  const completedChecklist = checklistItems.filter((i: any) => i.done).length;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
    >
      <div className="w-full sm:w-[560px] lg:w-[640px] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header do Drawer */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-secondary/20">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border">
              #{task?.number || '...'}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task?.createdAt ? new Date(task.createdAt).toLocaleDateString('pt-BR') : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleArchive}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Arquivar tarefa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Fechar (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Corpo do Drawer com Scroll */}
        {loading && !task ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            Carregando detalhes...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Título Editável in-place */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (title.trim() && title !== task?.title) {
                    handleSaveProperties({ title: title.trim() });
                  }
                }}
                className="w-full text-base sm:text-lg font-semibold text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors px-1 py-0.5 rounded"
                placeholder="Título da demanda..."
              />
            </div>

            {/* Painel de Propriedades Rápidas (Grid Limpo) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-secondary/30 rounded-xl border border-border/80 text-xs">
              {/* Status */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Status
                </label>
                <select
                  value={statusId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setStatusId(newId);
                    handleSaveProperties({ statusId: newId });
                  }}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                >
                  {statuses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Prioridade
                </label>
                <select
                  value={priority}
                  onChange={(e) => {
                    const newP = e.target.value as TaskPriority;
                    setPriority(newP);
                    handleSaveProperties({ priority: newP });
                  }}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>

              {/* Prazo */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Prazo de Entrega
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDueDate(val);
                    handleSaveProperties({ dueDate: val ? new Date(val).toISOString() : null });
                  }}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Responsável */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Responsável
                </label>
                <select
                  value={assigneeId}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setAssigneeId(val);
                    if (val) {
                      await api.post(`/tasks/${taskId}/assignees`, { userId: val });
                    }
                    onTaskUpdated();
                  }}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Sem responsável</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user?.name || m.user?.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Projeto */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Projeto
                </label>
                <select
                  value={projectId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProjectId(val);
                    handleSaveProperties({ projectId: val || null });
                  }}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                >
                  <option value="">Nenhum</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Cliente
                </label>
                <select
                  value={clientId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientId(val);
                    handleSaveProperties({ clientId: val || null });
                  }}
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

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Descrição</span>
                {isSaving && <span className="text-[10px] text-muted-foreground animate-pulse">Salvando...</span>}
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  if (description !== task?.description) {
                    handleSaveProperties({ description: description.trim() });
                  }
                }}
                placeholder="Adicione detalhes, links ou contexto desta tarefa..."
                className="w-full bg-background border border-border/80 rounded-lg p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
              />
            </div>

            {/* Subtarefas / Checklist Interativo */}
            <div className="space-y-3 pt-2 border-t border-border/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-primary" />
                  <span>Checklist de Entregas</span>
                </span>
                {checklistItems.length > 0 && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {completedChecklist}/{checklistItems.length} ({Math.round((completedChecklist / checklistItems.length) * 100)}%)
                  </span>
                )}
              </div>

              {/* Barra de Progresso */}
              {checklistItems.length > 0 && (
                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${(completedChecklist / checklistItems.length) * 100}%` }}
                  />
                </div>
              )}

              {/* Lista de Itens com Checkbox Clicável */}
              <div className="space-y-1.5">
                {checklistItems.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id, !item.done)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors group"
                  >
                    <div
                      className={`h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                        item.done
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-border bg-background group-hover:border-primary'
                      }`}
                    >
                      {item.done && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs flex-1 break-words select-none ${
                        item.done ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Input Adicionar Item ao Checklist */}
              <form onSubmit={handleAddChecklist} className="flex gap-2">
                <input
                  type="text"
                  value={checklistText}
                  onChange={(e) => setChecklistText(e.target.value)}
                  placeholder="Novo item do checklist (Enter adiciona)..."
                  className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!checklistText.trim()}
                  className="px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Adicionar
                </button>
              </form>
            </div>

            {/* Comentários */}
            <div className="space-y-3 pt-2 border-t border-border/70">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                <span>Comentários e Atualizações</span>
              </span>

              {/* Feed de Comentários */}
              <div className="space-y-3">
                {task?.comments?.length > 0 ? (
                  task.comments.map((c: any) => (
                    <div key={c.id} className="p-3 rounded-lg bg-secondary/30 border border-border/60 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">{c.author?.name || 'Membro'}</span>
                        <span>{new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap leading-relaxed">{c.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground py-1">Nenhum comentário nesta tarefa ainda.</p>
                )}
              </div>

              {/* Form Novo Comentário */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Escreva um comentário ou alinhamento..."
                  className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  Enviar
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
