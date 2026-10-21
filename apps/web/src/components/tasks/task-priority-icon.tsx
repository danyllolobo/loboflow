import React from 'react';
import { TaskPriority } from '@loboflow/shared';
import { AlertCircle, ArrowDown, ArrowUp, Flame, Minus } from 'lucide-react';

export function TaskPriorityIcon({ priority, showLabel }: { priority: TaskPriority; showLabel?: boolean }) {
  switch (priority) {
    case 'URGENT':
      return (
        <span className="inline-flex items-center gap-1 text-rose-500 font-medium text-xs" title="Urgente">
          <Flame className="h-3.5 w-3.5 fill-rose-500/20 text-rose-500 shrink-0" />
          {showLabel && <span>Urgente</span>}
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1 text-orange-500 font-medium text-xs" title="Alta prioridade">
          <ArrowUp className="h-3.5 w-3.5 text-orange-500 shrink-0" />
          {showLabel && <span>Alta</span>}
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1 text-amber-500 font-medium text-xs" title="Média prioridade">
          <Minus className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          {showLabel && <span>Média</span>}
        </span>
      );
    case 'LOW':
    default:
      return (
        <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-xs" title="Baixa prioridade">
          <ArrowDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          {showLabel && <span>Baixa</span>}
        </span>
      );
  }
}
