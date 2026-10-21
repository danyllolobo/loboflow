import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Calendar, CheckSquare, MessageSquare, FolderKanban, Users2 } from 'lucide-react';
import { TaskPriorityIcon } from './task-priority-icon';

export interface TaskCardProps {
  task: any;
  onOpenDetail: (id: string) => void;
}

export function TaskCard({ task, onOpenDetail }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
  });

  const isOverdue = task.dueDate && new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);
  const isToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString();

  const checklistTotal = task._count?.checklist || 0;
  const commentsTotal = task._count?.comments || 0;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpenDetail(task.id)}
      className={`group relative bg-card hover:bg-card/90 border border-border/80 hover:border-primary/40 rounded-lg p-3 shadow-xs hover:shadow-sm cursor-grab active:cursor-grabbing transition-all select-none space-y-2.5 ${
        isDragging ? 'opacity-30 border-dashed border-2 border-primary/60 scale-[0.98]' : ''
      }`}
    >
      {/* Top Header: ID & Prioridade */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-mono text-muted-foreground font-semibold">
            #{task.number}
          </span>
          {task.project && (
            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded font-medium truncate max-w-[140px] flex items-center gap-1">
              <FolderKanban className="h-2.5 w-2.5 shrink-0 opacity-70" />
              <span className="truncate">{task.project.name}</span>
            </span>
          )}
        </div>

        <div className="shrink-0">
          <TaskPriorityIcon priority={task.priority} />
        </div>
      </div>

      {/* Título da Demanda */}
      <h4 className="text-xs font-medium text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
        {task.title}
      </h4>

      {/* Cliente (se houver e não for redundante com projeto) */}
      {task.client && !task.project && (
        <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
          <Users2 className="h-2.5 w-2.5 shrink-0 opacity-70" />
          <span className="truncate">{task.client.name}</span>
        </div>
      )}

      {/* Bottom Bar: Prazos, Checklist, Comentários e Responsável */}
      <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 font-medium ${
                isOverdue
                  ? 'text-rose-500 font-semibold'
                  : isToday
                  ? 'text-amber-500 font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              <Calendar className="h-3 w-3 shrink-0" />
              {new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </span>
          )}

          {checklistTotal > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
              <CheckSquare className="h-3 w-3" />
              {checklistTotal}
            </span>
          )}

          {commentsTotal > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground/80">
              <MessageSquare className="h-3 w-3" />
              {commentsTotal}
            </span>
          )}
        </div>

        {/* Avatar do Responsável */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex -space-x-1.5 items-center">
            {task.assignees.slice(0, 2).map((a: any) => (
              <div
                key={a.userId}
                className="h-5 w-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold border border-card flex items-center justify-center uppercase shrink-0"
                title={a.user?.name || 'Membro'}
              >
                {a.user?.name?.[0] || 'U'}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
