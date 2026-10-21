import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, CornerDownLeft } from 'lucide-react';

interface QuickTaskInputProps {
  statusId: string;
  onCreate: (title: string, statusId: string) => Promise<void>;
}

export function QuickTaskInput({ statusId, onCreate }: QuickTaskInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || loading) return;

    try {
      setLoading(true);
      await onCreate(title.trim(), statusId);
      setTitle('');
      // Mantém o input aberto para poder adicionar várias tarefas em sequência rapidamente
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setTitle('');
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-1.5 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        <span>Adicionar demanda</span>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-2 bg-card border border-primary/40 rounded-lg shadow-sm space-y-2">
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="O que precisa ser feito? (Enter salva, Esc cancela)"
        className="w-full bg-background border border-border/80 rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        disabled={loading}
      />
      <div className="flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setTitle('');
          }}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
        >
          <X className="h-3 w-3" /> Cancelar
        </button>
        <button
          type="submit"
          disabled={!title.trim() || loading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-2.5 py-1 rounded-md flex items-center gap-1 font-medium disabled:opacity-50 cursor-pointer"
        >
          <span>Criar</span>
          <CornerDownLeft className="h-3 w-3" />
        </button>
      </div>
    </form>
  );
}
