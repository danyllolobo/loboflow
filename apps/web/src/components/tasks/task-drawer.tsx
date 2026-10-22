import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Pencil,
  Send,
  AtSign,
  History,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Filter,
  CheckCheck,
  CornerDownLeft,
  Code,
  Bold,
} from 'lucide-react';
import { TaskPriority } from '@loboflow/shared';
import { api } from '../../lib/api';
import { TaskPriorityIcon } from './task-priority-icon';
import { useAuth } from '../../contexts/auth-context';
import { formatRelativeTime } from '../../lib/date-utils';

export interface TaskDrawerProps {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated: () => void;
  statuses: any[];
  projects: any[];
  clients: any[];
  members: any[];
}

function getAvatarInfo(name: string = 'User') {
  const clean = name.trim() || 'U';
  const parts = clean.split(/\s+/);
  const first = parts[0] || 'U';
  const last = parts[parts.length - 1] || 'U';
  const initials =
    parts.length > 1
      ? ((first[0] || '') + (last[0] || '')).toUpperCase()
      : clean.slice(0, 2).toUpperCase();

  const sum = clean.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palettes = [
    'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
    'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
    'from-purple-500/20 to-violet-500/20 text-purple-400 border-purple-500/30',
    'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
    'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30',
    'from-cyan-500/20 to-sky-500/20 text-cyan-400 border-cyan-500/30',
  ];
  return { initials, colorClass: palettes[sum % palettes.length] };
}

function renderCommentBody(text: string) {
  if (!text) return null;
  const parts = text.split(/(@[a-zA-Z0-9_À-ÿ.-]+)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          return (
            <span
              key={index}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-primary/15 text-primary border border-primary/25 mx-0.5 shadow-2xs"
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
}

function renderActivityDescription(activity: any) {
  const action = activity?.action || '';
  const changes = activity?.changes || {};

  switch (action) {
    case 'task.created':
      return 'criou esta demanda';
    case 'task.status_changed':
      if (changes.from && changes.to) {
        return `moveu de "${changes.from}" para "${changes.to}"`;
      }
      return 'atualizou a etapa do fluxo';
    case 'task.updated':
      if (changes.statusId) return 'atualizou o status da demanda';
      if (changes.priority) return `alterou a prioridade para ${changes.priority}`;
      if (changes.dueDate !== undefined) {
        if (!changes.dueDate) return 'removeu o prazo de entrega';
        const dateStr = typeof changes.dueDate === 'string'
          ? changes.dueDate.split('T')[0]
          : '';
        return `definiu o prazo para ${dateStr}`;
      }
      if (changes.projectId !== undefined) return 'alterou o projeto vinculado';
      if (changes.clientId !== undefined) return 'alterou o cliente vinculado';
      return 'atualizou propriedades da demanda';
    case 'task.commented':
      return 'adicionou um comentário';
    case 'task.comment_deleted':
      return 'removeu um comentário';
    case 'task.checklist_added':
      return `adicionou a subtarefa: "${changes.title || 'Nova entrega'}"`;
    case 'task.checklist_completed':
      return `concluiu a subtarefa: "${changes.title || 'Entrega'}"`;
    case 'task.checklist_reopened':
      return `reabriu a subtarefa: "${changes.title || 'Entrega'}"`;
    case 'task.checklist_removed':
      return `removeu a subtarefa: "${changes.title || 'Entrega'}"`;
    case 'task.archived':
      return 'arquivou a demanda';
    default:
      return typeof action === 'string' && action
        ? action.replace('task.', '')
        : 'atualizou a demanda';
  }
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
  const { user } = useAuth();
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

  // Subtarefas / Checklist
  const [checklistText, setChecklistText] = useState('');
  const [checklistFilter, setChecklistFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState('');
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const checklistInputRef = useRef<HTMLInputElement>(null);

  // Feed: Comentários & Atividades
  const [feedTab, setFeedTab] = useState<'comments' | 'activity' | 'all'>('comments');
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showMentionPopover, setShowMentionPopover] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Atividades
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadActivities = async (id: string) => {
    try {
      setLoadingActivities(true);
      const res: any = await api.get(`/tasks/${id}/activities`);
      setActivities(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Falha ao carregar histórico de atividades', err);
    } finally {
      setLoadingActivities(false);
    }
  };

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

        const matchedProject = projects.find((p) => p.id === res.projectId);
        const resolvedClientId = res.clientId || matchedProject?.clientId || '';
        setClientId(resolvedClientId);

        setDueDate(res.dueDate ? res.dueDate.split('T')[0] : '');
        setAssigneeId(res.assignees?.[0]?.userId || '');

        loadActivities(taskId);
      } catch (err) {
        console.error('Falha ao carregar detalhes da tarefa', err);
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [taskId, projects]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMentionPopover) {
          setShowMentionPopover(false);
          return;
        }
        if (editingChecklistId) {
          setEditingChecklistId(null);
          return;
        }
        if (editingCommentId) {
          setEditingCommentId(null);
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showMentionPopover, editingChecklistId, editingCommentId]);

  const handleSaveProperties = async (updates: Partial<any>) => {
    if (!taskId) return;
    try {
      setIsSaving(true);
      const updated = await api.patch(`/tasks/${taskId}`, updates);
      setTask((prev: any) => ({
        ...(prev || {}),
        ...updates,
        ...(typeof updated === 'object' && updated ? updated : {}),
      }));
      onTaskUpdated();
      loadActivities(taskId);
    } catch (err: any) {
      console.error('Falha ao atualizar tarefa', err);
      alert(err.message || 'Erro ao salvar alterações da tarefa');
    } finally {
      setIsSaving(false);
    }
  };

  const availableProjects = clientId
    ? (projects || []).filter((p) => p.clientId === clientId)
    : (projects || []);

  const handleClientChange = (newCId: string) => {
    setClientId(newCId);
    let nextPId = projectId;
    if (newCId) {
      const currentProj = (projects || []).find((p) => p.id === projectId);
      if (currentProj && currentProj.clientId !== newCId) {
        nextPId = '';
        setProjectId('');
      }
    } else {
      const currentProj = (projects || []).find((p) => p.id === projectId);
      if (currentProj?.clientId) {
        nextPId = '';
        setProjectId('');
      }
    }
    handleSaveProperties({
      clientId: newCId || null,
      projectId: nextPId || null,
    });
  };

  const handleProjectChange = (newPId: string) => {
    setProjectId(newPId);
    let nextCId = clientId;
    if (newPId) {
      const proj = (projects || []).find((p) => p.id === newPId);
      if (proj?.clientId) {
        nextCId = proj.clientId;
        setClientId(proj.clientId);
      }
    }
    handleSaveProperties({
      projectId: newPId || null,
      clientId: nextCId || null,
    });
  };

  // Subtarefas (Checklist) Handlers
  const handleToggleChecklist = async (itemId: string, done: boolean) => {
    if (!taskId) return;
    try {
      await api.patch(`/tasks/${taskId}/checklist/${itemId}`, { done });
      const updatedTask = await api.get(`/tasks/${taskId}`);
      setTask(updatedTask);
      onTaskUpdated();
      loadActivities(taskId);
    } catch (err) {
      console.error('Falha ao alternar checklist', err);
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskId || !checklistText.trim()) return;

    try {
      setIsAddingChecklist(true);
      await api.post(`/tasks/${taskId}/checklist`, { title: checklistText.trim() });
      setChecklistText('');
      const updatedTask = await api.get(`/tasks/${taskId}`);
      setTask(updatedTask);
      onTaskUpdated();
      loadActivities(taskId);
      setTimeout(() => checklistInputRef.current?.focus(), 50);
    } catch (err: any) {
      alert(err.message || 'Falha ao adicionar subtarefa');
    } finally {
      setIsAddingChecklist(false);
    }
  };

  const handleDeleteChecklist = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!taskId) return;
    try {
      await api.delete(`/tasks/${taskId}/checklist/${itemId}`);
      const updatedTask = await api.get(`/tasks/${taskId}`);
      setTask(updatedTask);
      onTaskUpdated();
      loadActivities(taskId);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir subtarefa');
    }
  };

  const handleSaveEditChecklist = async (itemId: string) => {
    if (!taskId || !editingChecklistTitle.trim()) return;
    try {
      await api.patch(`/tasks/${taskId}/checklist/${itemId}`, {
        title: editingChecklistTitle.trim(),
      });
      setEditingChecklistId(null);
      const updatedTask = await api.get(`/tasks/${taskId}`);
      setTask(updatedTask);
      onTaskUpdated();
    } catch (err: any) {
      alert(err.message || 'Erro ao renomear subtarefa');
    }
  };

  // Comentários Handlers
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskId || !commentText.trim() || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      await api.post(`/tasks/${taskId}/comments`, { body: commentText.trim() });
      setCommentText('');
      setShowMentionPopover(false);
      const updatedTask = await api.get(`/tasks/${taskId}`);
      setTask(updatedTask);
      onTaskUpdated();
      loadActivities(taskId);
    } catch (err: any) {
      alert(err.message || 'Falha ao adicionar comentário');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAddComment();
    }
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!taskId || !editCommentBody.trim()) return;
    try {
      await api.patch(`/tasks/${taskId}/comments/${commentId}`, {
        body: editCommentBody.trim(),
      });
      setEditingCommentId(null);
      const updatedTask = await api.get(`/tasks/${taskId}`);
      setTask(updatedTask);
      loadActivities(taskId);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar comentário');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!taskId) return;
    if (!confirm('Deseja excluir este comentário permanentemente?')) return;
    try {
      await api.delete(`/tasks/${taskId}/comments/${commentId}`);
      const updatedTask = await api.get(`/tasks/${taskId}`);
      setTask(updatedTask);
      onTaskUpdated();
      loadActivities(taskId);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir comentário');
    }
  };

  const handleInsertMention = (memberName: string) => {
    const formatted = `@${memberName.replace(/\s+/g, '')} `;
    setCommentText((prev) => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + formatted);
    setShowMentionPopover(false);
    setTimeout(() => commentTextareaRef.current?.focus(), 50);
  };

  const handleArchive = async () => {
    if (!taskId) return;
    if (!confirm('Deseja realmente excluir esta demanda?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      onTaskUpdated();
      onClose();
    } catch (err: any) {
      console.error('Falha ao excluir demanda', err);
      alert(err.message || 'Erro ao excluir demanda. Verifique suas permissões.');
    }
  };

  // Subtarefas calculadas
  const checklistItems = task?.checklist || [];
  const completedChecklist = checklistItems.filter((i: any) => i.done).length;
  const pendingChecklist = checklistItems.length - completedChecklist;
  const progressPercent =
    checklistItems.length > 0
      ? Math.round((completedChecklist / checklistItems.length) * 100)
      : 0;

  const filteredChecklist = useMemo(() => {
    if (checklistFilter === 'pending') return checklistItems.filter((i: any) => !i.done);
    if (checklistFilter === 'completed') return checklistItems.filter((i: any) => i.done);
    return checklistItems;
  }, [checklistItems, checklistFilter]);

  // Feed unificado
  const unifiedFeed = useMemo(() => {
    const list: any[] = [];
    if (task?.comments) {
      task.comments.forEach((c: any) => {
        list.push({
          type: 'comment',
          id: `comment-${c.id}`,
          createdAt: new Date(c.createdAt).getTime(),
          data: c,
        });
      });
    }
    if (activities) {
      activities.forEach((a: any) => {
        if (a.action !== 'task.commented') {
          list.push({
            type: 'activity',
            id: `activity-${a.id}`,
            createdAt: new Date(a.createdAt).getTime(),
            data: a,
          });
        }
      });
    }
    return list.sort((a, b) => b.createdAt - a.createdAt);
  }, [task?.comments, activities]);

  const filteredMembers = useMemo(() => {
    if (!mentionSearch.trim()) return members;
    const q = mentionSearch.toLowerCase();
    return members.filter(
      (m: any) =>
        (m.user?.name || '').toLowerCase().includes(q) ||
        (m.user?.email || '').toLowerCase().includes(q),
    );
  }, [members, mentionSearch]);

  if (!taskId) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150"
    >
      <div className="w-full sm:w-[580px] lg:w-[680px] h-full bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header do Drawer */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-secondary/30">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-muted-foreground bg-secondary px-2.5 py-1 rounded-md border border-border shadow-2xs">
              #{task?.number || '...'}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 opacity-70" />
              {task?.createdAt ? new Date(task.createdAt).toLocaleDateString('pt-BR') : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleArchive}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Arquivar tarefa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Corpo do Drawer */}
        {loading && !task ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            Carregando detalhes da demanda...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {/* Título Editável */}
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
                className="w-full text-lg sm:text-xl font-bold tracking-tight text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors px-1 py-1 rounded"
                placeholder="Título da demanda..."
              />
            </div>

            {/* Painel de Propriedades Rápidas */}
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

              {/* Prazo de Entrega */}
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
                    handleSaveProperties({ dueDate: val || null });
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
                    loadActivities(taskId);
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
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer truncate"
                >
                  <option value="">Nenhum</option>
                  {availableProjects.length === 0 && clientId ? (
                    <option value="" disabled>
                      Nenhum projeto vinculado
                    </option>
                  ) : (
                    availableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Cliente
                </label>
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
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
                {isSaving && (
                  <span className="text-[10px] text-muted-foreground animate-pulse">
                    Salvando...
                  </span>
                )}
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
                className="w-full bg-background border border-border/80 rounded-lg p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y leading-relaxed"
              />
            </div>

            {/* SEÇÃO 1: SUBTAREFAS & CHECKLIST REVOLUCIONÁRIO */}
            <div className="space-y-3.5 pt-4 border-t border-border/80">
              {/* Header do Checklist com Estatísticas e Progresso */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      Subtarefas & Checklist de Entregas
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Etapas de execução e controle de qualidade
                    </p>
                  </div>
                </div>

                {checklistItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                        progressPercent === 100
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-2xs'
                          : 'bg-secondary text-muted-foreground border-border'
                      }`}
                    >
                      {progressPercent === 100 ? (
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-emerald-400" /> 100% Concluído
                        </span>
                      ) : (
                        `${completedChecklist}/${checklistItems.length} (${progressPercent}%)`
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Barra de Progresso com Gradiente Dinâmico */}
              {checklistItems.length > 0 && (
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-secondary/80 rounded-full overflow-hidden p-0.5 border border-border/40">
                    <div
                      className={`h-full transition-all duration-500 ease-out rounded-full ${
                        progressPercent === 100
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/20'
                          : 'bg-gradient-to-r from-primary to-emerald-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Pílulas de Filtro Rápido */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setChecklistFilter('all')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] transition-all cursor-pointer ${
                        checklistFilter === 'all'
                          ? 'bg-primary/15 text-primary font-bold border border-primary/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                      }`}
                    >
                      Todas ({checklistItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklistFilter('pending')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] transition-all cursor-pointer ${
                        checklistFilter === 'pending'
                          ? 'bg-amber-500/15 text-amber-400 font-bold border border-amber-500/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                      }`}
                    >
                      Pendentes ({pendingChecklist})
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklistFilter('completed')}
                      className={`px-2.5 py-0.5 rounded-md text-[11px] transition-all cursor-pointer ${
                        checklistFilter === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                      }`}
                    >
                      Concluídas ({completedChecklist})
                    </button>
                  </div>
                </div>
              )}

              {/* Lista Interativa de Subtarefas */}
              <div className="space-y-1.5 pt-1">
                {filteredChecklist.map((item: any) => {
                  const isEditingThis = editingChecklistId === item.id;

                  if (isEditingThis) {
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-2 bg-secondary/60 border border-primary/40 rounded-xl animate-in fade-in duration-100"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingChecklistTitle}
                          onChange={(e) => setEditingChecklistTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditChecklist(item.id);
                            if (e.key === 'Escape') setEditingChecklistId(null);
                          }}
                          className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditChecklist(item.id)}
                          className="p-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs cursor-pointer"
                          title="Salvar"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingChecklistId(null)}
                          className="p-1 rounded-md bg-secondary text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                          title="Cancelar"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklist(item.id, !item.done)}
                      className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all cursor-pointer group ${
                        item.done
                          ? 'bg-secondary/20 border-border/40 hover:bg-secondary/40'
                          : 'bg-card border-border/80 hover:border-primary/40 hover:bg-secondary/30 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleChecklist(item.id, !item.done);
                          }}
                          className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            item.done
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                              : 'border-border bg-background/80 group-hover:border-primary group-hover:bg-primary/5'
                          }`}
                        >
                          {item.done && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <span
                            className={`text-xs block break-words select-none transition-colors ${
                              item.done
                                ? 'line-through text-muted-foreground/70'
                                : 'text-foreground font-medium'
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.done && item.doneAt && (
                            <span className="text-[10px] text-emerald-400/80 font-mono block mt-0.5">
                              Concluído {formatRelativeTime(item.doneAt)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botões de Ação no Hover */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChecklistId(item.id);
                            setEditingChecklistTitle(item.title);
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                          title="Editar subtarefa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteChecklist(item.id, e)}
                          className="p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remover subtarefa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredChecklist.length === 0 && checklistItems.length > 0 && (
                  <p className="text-[11px] text-muted-foreground py-2 text-center italic">
                    Nenhuma subtarefa neste filtro.
                  </p>
                )}
              </div>

              {/* Input Adicionar Rápido com Foco Contínuo */}
              <form onSubmit={handleAddChecklist} className="flex gap-2 pt-1">
                <div className="relative flex-1">
                  <input
                    ref={checklistInputRef}
                    type="text"
                    value={checklistText}
                    onChange={(e) => setChecklistText(e.target.value)}
                    placeholder="Adicionar subtarefa... (Pressione Enter para criar em série)"
                    className="w-full bg-background border border-border/90 rounded-xl px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                  />
                  {checklistText.trim() && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border pointer-events-none flex items-center gap-1">
                      <CornerDownLeft className="h-2.5 w-2.5" /> Enter
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!checklistText.trim() || isAddingChecklist}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold disabled:opacity-50 transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar</span>
                </button>
              </form>
            </div>

            {/* SEÇÃO 2: FEED REVOLUCIONÁRIO (COMENTÁRIOS & ATIVIDADES) */}
            <div className="space-y-4 pt-4 border-t border-border/80">
              {/* Tabs do Feed */}
              <div className="flex items-center justify-between border-b border-border/60 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFeedTab('comments')}
                    className={`flex items-center gap-1.5 pb-1.5 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-2 ${
                      feedTab === 'comments'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Comentários</span>
                    <span className="text-[10px] bg-secondary px-1.5 py-0.2 rounded-full font-mono">
                      {task?.comments?.length || 0}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedTab('activity')}
                    className={`flex items-center gap-1.5 pb-1.5 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-2 ${
                      feedTab === 'activity'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>Histórico de Atividades</span>
                    <span className="text-[10px] bg-secondary px-1.5 py-0.2 rounded-full font-mono">
                      {activities.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedTab('all')}
                    className={`flex items-center gap-1.5 pb-1.5 text-xs font-bold transition-all cursor-pointer border-b-2 -mb-2 ${
                      feedTab === 'all'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Tudo</span>
                  </button>
                </div>
              </div>

              {/* Composer de Novo Comentário (Linear Style) */}
              <div className="relative bg-secondary/20 border border-border/80 rounded-2xl p-3 space-y-2.5 shadow-2xs">
                {/* Popover Flutuante de Menções (@) */}
                {showMentionPopover && (
                  <div className="absolute left-3 bottom-full mb-2 w-64 bg-card border border-border rounded-xl shadow-2xl p-2 z-20 space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center justify-between pb-1 border-b border-border/60">
                      <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                        <AtSign className="h-3 w-3 text-primary" /> Mencionar Membro
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMentionPopover(false)}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Buscar membro..."
                      value={mentionSearch}
                      onChange={(e) => setMentionSearch(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {filteredMembers.map((m: any) => {
                        const name = m.user?.name || m.user?.email || 'Membro';
                        const avatar = getAvatarInfo(name);
                        return (
                          <button
                            key={m.userId}
                            type="button"
                            onClick={() => handleInsertMention(name)}
                            className="w-full text-left p-1.5 rounded-lg hover:bg-secondary flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <div
                              className={`h-5 w-5 rounded-full bg-gradient-to-br ${avatar.colorClass} border flex items-center justify-center text-[9px] font-bold shrink-0`}
                            >
                              {avatar.initials}
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-medium text-foreground block truncate">
                                {name}
                              </span>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {m.user?.email}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 items-start">
                  {/* Avatar do Autor Atual */}
                  <div
                    className={`h-7 w-7 rounded-full bg-gradient-to-br ${
                      getAvatarInfo(user?.name || 'Eu').colorClass
                    } border flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 shadow-2xs`}
                  >
                    {getAvatarInfo(user?.name || 'Eu').initials}
                  </div>

                  <div className="flex-1 space-y-2">
                    <textarea
                      ref={commentTextareaRef}
                      rows={2}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={handleCommentKeyDown}
                      placeholder="Deixe um comentário, alinhamento ou nota para a equipe..."
                      className="w-full bg-background border border-border/80 rounded-xl p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y leading-relaxed"
                    />

                    {/* Toolbar de Ações Rápidas */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => {
                            setShowMentionPopover(!showMentionPopover);
                            setMentionSearch('');
                          }}
                          className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                            showMentionPopover
                              ? 'bg-primary/20 text-primary border-primary/40'
                              : 'bg-background border-border/80 hover:bg-secondary hover:text-foreground'
                          }`}
                          title="Mencionar membro da equipe (@)"
                        >
                          <AtSign className="h-3 w-3" />
                          <span className="text-[10px] font-semibold">Mencionar</span>
                        </button>
                        <span className="hidden sm:inline text-[10px] text-muted-foreground/60 ml-1">
                          Ctrl + Enter para enviar
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddComment()}
                        disabled={!commentText.trim() || isSubmittingComment}
                        className="px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold disabled:opacity-50 transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="h-3 w-3" />
                        <span>{isSubmittingComment ? 'Enviando...' : 'Enviar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* LISTA DO FEED */}
              {feedTab === 'comments' && (
                <div className="space-y-3">
                  {task?.comments?.length > 0 ? (
                    task.comments.map((c: any) => {
                      const authorName = c.author?.name || 'Membro da equipe';
                      const isMe = user?.id === c.authorId;
                      const avatar = getAvatarInfo(authorName);
                      const isEditingThis = editingCommentId === c.id;

                      if (isEditingThis) {
                        return (
                          <div
                            key={c.id}
                            className="p-3 bg-secondary/50 border border-primary/40 rounded-2xl space-y-2 animate-in fade-in duration-100"
                          >
                            <textarea
                              autoFocus
                              rows={2}
                              value={editCommentBody}
                              onChange={(e) => setEditCommentBody(e.target.value)}
                              className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="px-3 py-1 rounded-lg text-xs bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditComment(c.id)}
                                className="px-3.5 py-1 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-2xl bg-secondary/25 border border-border/70 text-xs space-y-2 group hover:bg-secondary/40 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-6 w-6 rounded-full bg-gradient-to-br ${avatar.colorClass} border flex items-center justify-center text-[10px] font-bold shrink-0`}
                              >
                                {avatar.initials}
                              </div>
                              <span className="font-bold text-foreground flex items-center gap-1.5">
                                {authorName}
                                {isMe && (
                                  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.2 rounded border border-primary/20">
                                    Você
                                  </span>
                                )}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono">
                                • {formatRelativeTime(c.createdAt)}
                              </span>
                              {c.editedAt && (
                                <span className="text-[10px] text-muted-foreground/60 italic">
                                  (editado)
                                </span>
                              )}
                            </div>

                            {/* Ações no comentário do autor */}
                            {isMe && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCommentId(c.id);
                                    setEditCommentBody(c.body);
                                  }}
                                  className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors cursor-pointer"
                                  title="Editar comentário"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="p-1 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Excluir comentário"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="text-foreground whitespace-pre-wrap leading-relaxed pl-8">
                            {renderCommentBody(c.body)}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 rounded-2xl border border-dashed border-border/80 text-center space-y-1.5">
                      <MessageSquare className="h-6 w-6 text-muted-foreground/60 mx-auto" />
                      <p className="text-xs font-semibold text-foreground">
                        Nenhum comentário nesta demanda
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Use o campo acima para registrar alinhamentos e mencionar colegas com @.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TIMELINE DE ATIVIDADES */}
              {feedTab === 'activity' && (
                <div className="space-y-3">
                  {loadingActivities ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Carregando histórico de auditoria...
                    </div>
                  ) : activities.length > 0 ? (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                      {activities.map((a: any) => {
                        const actorName = a.actor?.name || 'Sistema';
                        const desc = renderActivityDescription(a);

                        return (
                          <div key={a.id} className="relative flex items-start gap-3 text-xs">
                            <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-background border-2 border-primary shrink-0 shadow-2xs" />
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold text-foreground">{actorName} </span>
                              <span className="text-muted-foreground">{desc}</span>
                              <span className="text-[10px] text-muted-foreground/60 block font-mono mt-0.5">
                                {formatRelativeTime(a.createdAt)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                      Nenhuma atividade registrada ainda.
                    </div>
                  )}
                </div>
              )}

              {/* FEED UNIFICADO (TUDO) */}
              {feedTab === 'all' && (
                <div className="space-y-3">
                  {unifiedFeed.length > 0 ? (
                    unifiedFeed.map((item) => {
                      if (item.type === 'comment') {
                        const c = item.data;
                        const authorName = c.author?.name || 'Membro';
                        const avatar = getAvatarInfo(authorName);
                        return (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-2xl bg-secondary/25 border border-border/70 text-xs space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-6 w-6 rounded-full bg-gradient-to-br ${avatar.colorClass} border flex items-center justify-center text-[10px] font-bold shrink-0`}
                              >
                                {avatar.initials}
                              </div>
                              <span className="font-bold text-foreground">{authorName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                • {formatRelativeTime(c.createdAt)}
                              </span>
                            </div>
                            <div className="text-foreground whitespace-pre-wrap leading-relaxed pl-8">
                              {renderCommentBody(c.body)}
                            </div>
                          </div>
                        );
                      }

                      const a = item.data;
                      const actorName = a.actor?.name || 'Sistema';
                      const desc = renderActivityDescription(a);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-secondary/15 text-xs text-muted-foreground"
                        >
                          <div className="h-2 w-2 rounded-full bg-primary/70 shrink-0" />
                          <div className="flex-1 truncate">
                            <span className="font-semibold text-foreground">{actorName} </span>
                            <span>{desc}</span>
                          </div>
                          <span className="text-[10px] font-mono shrink-0">
                            {formatRelativeTime(a.createdAt)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 rounded-2xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                      Nenhum evento registrado ainda.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
