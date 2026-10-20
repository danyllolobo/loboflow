import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import { NavLink } from 'react-router';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  FolderKanban,
  ListTodo,
  TrendingUp,
  UserCheck,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export function DashboardPage() {
  const { activeOrg } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.get('/dashboard');
        setData(res);
      } catch (err) {
        console.error('Falha ao carregar dashboard', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeOrg?.organizationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        <Clock className="h-5 w-5 animate-spin mr-2 text-primary" /> Carregando indicadores da operação...
      </div>
    );
  }

  const summary = data?.summary || {
    totalTasksOpen: 0,
    overdueCount: 0,
    dueTodayCount: 0,
    upcomingCount: 0,
    completedRecently: 0,
    activeProjectsCount: 0,
  };

  const hasData = summary.totalTasksOpen > 0 || summary.activeProjectsCount > 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
            Painel Operacional
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visão consolidada das prioridades, prazos e entregas da {activeOrg?.organizationName}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <NavLink
            to="/tasks"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" /> Nova Tarefa
          </NavLink>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Tarefas Abertas</span>
            <ListTodo className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-display">{summary.totalTasksOpen}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Em andamento na equipe</div>
        </div>

        <div className={`rounded-xl p-3.5 border shadow-sm ${summary.overdueCount > 0 ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : 'bg-card border-border/80'}`}>
          <div className="flex items-center justify-between mb-1.5 text-muted-foreground">
            <span className="text-xs font-medium text-rose-500 font-semibold">Atrasadas</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-display text-rose-500">{summary.overdueCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Prazo expirado</div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium text-amber-500 font-semibold">Vencem Hoje</span>
            <Calendar className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-display text-amber-500">{summary.dueTodayCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Entregas do dia</div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Próximos 7 Dias</span>
            <Clock className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-display">{summary.upcomingCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Entregas da semana</div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Projetos Ativos</span>
            <FolderKanban className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-display">{summary.activeProjectsCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Operando atualmente</div>
        </div>

        <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium text-emerald-500 font-semibold">Concluídas</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-display text-emerald-500">{summary.completedRecently}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Últimos 30 dias</div>
        </div>
      </div>

      {/* Estado Vazio Útil se não houver dados */}
      {!hasData && (
        <div className="p-8 border border-dashed border-border rounded-2xl bg-secondary/20 text-center max-w-xl mx-auto my-8">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold">Bem-vindo ao LoboFlow!</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Sua organização está pronta para operar. Comece cadastrando o primeiro projeto ou tarefa para ativar os gráficos e a inteligência do Jarvis.
          </p>
          <div className="flex justify-center gap-3">
            <NavLink
              to="/projects"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary hover:bg-secondary/80 border border-border transition-colors"
            >
              Criar Primeiro Projeto
            </NavLink>
            <NavLink
              to="/tasks"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors shadow-sm"
            >
              Criar Primeira Tarefa
            </NavLink>
          </div>
        </div>
      )}

      {/* Grid de Duas Colunas: Tarefas Críticas / Projetos */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: O que precisa ser feito hoje / Atrasadas */}
          <div className="lg:col-span-2 space-y-6">
            {/* Vencem Hoje */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  <h2 className="font-semibold text-sm">O que precisa ser feito hoje?</h2>
                </div>
                <NavLink to="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </NavLink>
              </div>

              {data.dueTodayTasks?.length > 0 ? (
                <div className="divide-y divide-border/60">
                  {data.dueTodayTasks.map((t: any) => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="truncate">
                        <span className="text-xs font-mono text-muted-foreground mr-2">#{t.number}</span>
                        <span className="text-sm font-medium hover:text-primary cursor-pointer">{t.title}</span>
                        {t.project && (
                          <span className="ml-2 text-[11px] bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                            {t.project.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase"
                          style={{ backgroundColor: `${t.status?.color}20`, color: t.status?.color }}
                        >
                          {t.status?.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-4 text-center">
                  Nenhuma entrega urgente programada para o dia de hoje.
                </div>
              )}
            </div>

            {/* Atrasadas */}
            {data.overdueTasks?.length > 0 && (
              <div className="bg-rose-500/5 border border-rose-500/30 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-500" />
                    <h2 className="font-semibold text-sm text-rose-500">Tarefas que requerem atenção imediata (Atrasadas)</h2>
                  </div>
                  <NavLink to="/tasks" className="text-xs text-rose-500 hover:underline flex items-center gap-1 font-medium">
                    Ver atrasadas <ArrowRight className="h-3 w-3" />
                  </NavLink>
                </div>

                <div className="divide-y divide-rose-500/20">
                  {data.overdueTasks.map((t: any) => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="truncate">
                        <span className="text-xs font-mono text-rose-400 mr-2">#{t.number}</span>
                        <span className="text-sm font-medium">{t.title}</span>
                      </div>
                      <span className="text-xs text-rose-500 font-semibold flex-shrink-0">
                        Venceu em {new Date(t.dueDate).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projetos Ativos e Progresso */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-purple-400" />
                  <h2 className="font-semibold text-sm">Progresso dos Projetos Ativos</h2>
                </div>
                <NavLink to="/projects" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Ver projetos <ArrowRight className="h-3 w-3" />
                </NavLink>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.projects?.map((p: any) => (
                  <div key={p.id} className="p-3 bg-secondary/30 rounded-lg border border-border/60">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-semibold truncate">{p.name}</span>
                      <span className="text-xs font-mono font-bold text-primary">{p.progressPercent}%</span>
                    </div>
                    {/* Barra de Progresso */}
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-2">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${p.progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{p.completedTasks} de {p.totalTasks} tarefas</span>
                      {p.dueDate && <span>Entrega: {new Date(p.dueDate).toLocaleDateString('pt-BR')}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna 3: Carga de Trabalho da Equipe */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-4 w-4 text-sky-400" />
                <h2 className="font-semibold text-sm">Distribuição de Carga da Equipe</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Volume de tarefas ativas sob responsabilidade de cada colaborador.
              </p>

              <div className="space-y-3">
                {data.workload?.map((w: any) => (
                  <div key={w.userId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {w.name?.[0]}
                      </div>
                      <span className="truncate">{w.name}</span>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                        w.openTasksCount > 8
                          ? 'bg-rose-500/10 text-rose-500'
                          : w.openTasksCount > 4
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-secondary text-foreground'
                      }`}
                    >
                      {w.openTasksCount} tarefas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
