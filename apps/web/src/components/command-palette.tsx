import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users2,
  FileText,
  TrendingUp,
  Building2,
  Settings,
  Plus,
  Search,
  Bot,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../contexts/theme-context';
import { useAuth } from '../contexts/auth-context';

export function CommandPalette({
  open,
  onOpenChange,
  onOpenCreateTask,
  onOpenJarvis,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenCreateTask?: () => void;
  onOpenJarvis?: () => void;
}) {
  const navigate = useNavigate();
  const { setTheme, resolvedTheme } = useTheme();
  const { activeOrg } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  if (!open) return null;

  const runCommand = (command: () => void) => {
    command();
    onOpenChange(false);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        <Command className="w-full">
          <div className="flex items-center px-3.5 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Digite um comando, página ou busque algo..."
              className="w-full py-3.5 text-xs text-foreground bg-transparent placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-6 text-center text-xs text-muted-foreground">
              Nenhum resultado encontrado.
            </Command.Empty>

            <Command.Group heading="Ações Rápidas" className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">
              {onOpenCreateTask && (
                <Command.Item
                  onSelect={() => runCommand(onOpenCreateTask)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                >
                  <Plus className="h-4 w-4 text-primary" />
                  <span>Nova Tarefa</span>
                </Command.Item>
              )}
              <Command.Item
                onSelect={() => runCommand(() => navigate('/settings?tab=organizations&create=true'))}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
              >
                <Building2 className="h-4 w-4 text-primary" />
                <span>Cadastrar Nova Empresa</span>
              </Command.Item>
              {onOpenJarvis && (
                <Command.Item
                  onSelect={() => runCommand(onOpenJarvis)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-sky-500/10 hover:text-sky-400 cursor-pointer transition-colors"
                >
                  <Bot className="h-4 w-4 text-sky-400" />
                  <span>Conversar com Jarvis IA</span>
                </Command.Item>
              )}
            </Command.Group>

            <Command.Group heading="Navegação" className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider pt-2">
              <Command.Item
                onSelect={() => runCommand(() => navigate('/dashboard'))}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/tasks'))}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                <CheckSquare className="h-4 w-4 text-muted-foreground" />
                <span>Tarefas (Kanban / Lista)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/projects'))}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span>Projetos</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/clients'))}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                <Users2 className="h-4 w-4 text-muted-foreground" />
                <span>Clientes</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/scripts'))}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Roteiros e Conteúdos</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/commercial'))}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span>Funil Comercial</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/settings?tab=organizations'))}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>Minhas Empresas</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate('/settings'))}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Configurações</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Preferências" className="text-[11px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider pt-2">
              <Command.Item
                onSelect={() => runCommand(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-foreground hover:bg-secondary cursor-pointer transition-colors"
              >
                {resolvedTheme === 'dark' ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
                <span>Alternar Tema ({resolvedTheme === 'dark' ? 'Mudar para Claro' : 'Mudar para Escuro'})</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="p-2 border-t border-border bg-secondary/30 flex items-center justify-between text-[11px] text-muted-foreground px-3">
            <span>{activeOrg?.organizationName || 'LoboFlow'}</span>
            <div className="flex items-center gap-2">
              <span>Navegue com ↑ ↓</span>
              <span>•</span>
              <span>Enter seleciona</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
