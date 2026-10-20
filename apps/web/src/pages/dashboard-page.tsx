import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/auth-context';
import { NavLink, useNavigate } from 'react-router';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FolderKanban,
  ListTodo,
  TrendingUp,
  UserCheck,
  Plus,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
  Flame,
  CheckSquare,
  Bot,
  Layers,
  ChevronRight,
} from 'lucide-react';

export function DashboardPage() {
  const { activeOrg, user } = useAuth();
  const navigate = useNavigate();
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-3">
        <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Sincronizando painel executivo...</span>
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
    <div className="space-y-7 max-w-7xl mx-auto pb-10">
      {/* Top Banner Executivo & Ações Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operação em Tempo Real
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-display">
            Olá, {user?.name?.split(' ')[0] || 'Gestor'} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe a cadência de entregas, gargalos e desempenho da equipe na <strong className="text-foreground font-semibold">{activeOrg?.organizationName}</strong>.
          </p>
        </div>

        {/* Botões de Ação Imediata */}
        <div className="flex flex-wrap items-center gap-2.5">
          <NavLink
            to="/projects"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold transition-all hover:shadow-sm"
          >
            <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Ver Projetos</span>
          </NavLink>
          <NavLink
            to="/tasks"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-md hover:shadow-primary/25 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nova Tarefa</span>
          </NavLink>
        </div>
      </div>

      {/* Grid de KPIs Clicáveis de Alto Impacto */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Tarefas Abertas */}
        <NavLink
          to="/tasks"
          className="group relative p-4 rounded-2xl bg-card border border-border hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-200 double-bezel flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold text-foreground/80 group-hover:text-primary transition-colors">
              Abertas
            </span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
              <ListTodo className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {summary.totalTasksOpen}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Em produção</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
            </div>
          </div>
        </NavLink>

        {/* Card 2: Atrasadas (Crítico) */}
        <NavLink
          to="/tasks"
          className={`group relative p-4 rounded-2xl border transition-all duration-200 double-bezel flex flex-col justify-between ${
            summary.overdueCount > 0
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-500 hover:bg-rose-500/15'
              : 'bg-card border-border hover:border-rose-500/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" /> Atrasadas
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-500 group-hover:scale-110 transition-transform">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-display text-rose-500">
              {summary.overdueCount}
            </div>
            <div className="text-[11px] text-rose-500/80 flex items-center justify-between">
              <span>Atenção urgente</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </NavLink>

        {/* Card 3: Vencem Hoje */}
        <NavLink
          to="/tasks"
          className="group relative p-4 rounded-2xl bg-card border border-border hover:border-amber-500/50 shadow-sm hover:shadow-md transition-all duration-200 double-bezel flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground/80 group-hover:text-amber-500 transition-colors">
              Vencem Hoje
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 group-hover:scale-110 transition-transform">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {summary.dueTodayCount}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Prioridade do dia</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-amber-500" />
            </div>
          </div>
        </NavLink>

        {/* Card 4: Próximos 7 Dias */}
        <NavLink
          to="/tasks"
          className="group relative p-4 rounded-2xl bg-card border border-border hover:border-sky-500/50 shadow-sm hover:shadow-md transition-all duration-200 double-bezel flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground/80 group-hover:text-sky-500 transition-colors">
              Próx. 7 Dias
            </span>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500 group-hover:scale-110 transition-transform">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {summary.upcomingCount}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Planejamento</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-sky-500" />
            </div>
          </div>
        </NavLink>

        {/* Card 5: Projetos Ativos */}
        <NavLink
          to="/projects"
          className="group relative p-4 rounded-2xl bg-card border border-border hover:border-indigo-500/50 shadow-sm hover:shadow-md transition-all duration-200 double-bezel flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground/80 group-hover:text-indigo-500 transition-colors">
              Projetos
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-display text-foreground">
              {summary.activeProjectsCount}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Em execução</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
            </div>
          </div>
        </NavLink>

        {/* Card 6: Concluídas */}
        <NavLink
          to="/tasks"
          className="group relative p-4 rounded-2xl bg-card border border-border hover:border-emerald-500/50 shadow-sm hover:shadow-md transition-all duration-200 double-bezel flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground/80 group-hover:text-emerald-500 transition-colors">
              Concluídas
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-bold font-display text-emerald-500">
              {summary.completedRecently}
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Últimos 30 dias</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500" />
            </div>
          </div>
        </NavLink>
      </div>

      {/* Grid Principal: Demandas Prioritárias & Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Vencem Hoje & Atrasadas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: O que precisa ser feito hoje */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm double-bezel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-foreground">
                    O que precisa ser feito hoje?
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Demandas com prazo fatal para hoje
                  </p>
                </div>
              </div>
              <NavLink
                to="/tasks"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1 group"
              >
                <span>Ver todas no Kanban</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </NavLink>
            </div>

            {data?.dueTodayTasks?.length > 0 ? (
              <div className="divide-y divide-border/60">
                {data.dueTodayTasks.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => navigate('/tasks')}
                    className="py-3 px-2 rounded-xl flex items-center justify-between gap-3 hover:bg-secondary/60 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="text-xs font-mono font-bold text-muted-foreground group-hover:text-primary transition-colors">
                        #{t.number}
                      </span>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {t.title}
                      </span>
                      {t.project && (
                        <span className="hidden sm:inline-block text-[11px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground truncate border border-border">
                          {t.project.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${t.status?.color}15`,
                          color: t.status?.color,
                          border: `1px solid ${t.status?.color}30`,
                        }}
                      >
                        {t.status?.name}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-500/60 mx-auto" />
                <p className="font-medium text-foreground">Tudo em dia para hoje!</p>
                <p>Nenhuma entrega pendente com prazo de vencimento para hoje.</p>
              </div>
            )}
          </div>

          {/* Card: Tarefas Atrasadas (se houver) */}
          {data?.overdueTasks?.length > 0 && (
            <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/30 shadow-sm double-bezel space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/15 text-rose-500">
                    <Flame className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm text-rose-500">
                      Atenção Operacional: Tarefas em Atraso
                    </h2>
                    <p className="text-xs text-rose-500/80">
                      Demandas cujo prazo já expirou
                    </p>
                  </div>
                </div>
                <NavLink
                  to="/tasks"
                  className="text-xs font-semibold text-rose-500 hover:underline flex items-center gap-1"
                >
                  <span>Gerenciar atrasos</span>
                  <ArrowRight className="h-3 w-3" />
                </NavLink>
              </div>

              <div className="divide-y divide-rose-500/20">
                {data.overdueTasks.map((t: any) => (
                  <div
                    key={t.id}
                    onClick={() => navigate('/tasks')}
                    className="py-3 px-2 rounded-xl flex items-center justify-between gap-3 hover:bg-rose-500/10 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-xs font-mono font-bold text-rose-400">#{t.number}</span>
                      <span className="text-sm font-medium text-foreground group-hover:text-rose-500 transition-colors truncate">
                        {t.title}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-rose-500 shrink-0">
                      Venceu {new Date(t.dueDate).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card: Progresso dos Projetos Ativos */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm double-bezel space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm text-foreground">
                    Progresso dos Projetos Ativos
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Cálculo automático de conclusão por volume de tarefas
                  </p>
                </div>
              </div>
              <NavLink
                to="/projects"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1 group"
              >
                <span>Ver projetos</span>
                <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </NavLink>
            </div>

            {data?.projectsProgress?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {data.projectsProgress.map((p: any) => (
                  <div
                    key={p.id}
                    onClick={() => navigate('/projects')}
                    className="p-4 rounded-xl bg-secondary/50 hover:bg-secondary border border-border transition-all cursor-pointer group space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {p.name}
                        </div>
                        {p.client && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            {p.client.name}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                        {p.progress}%
                      </span>
                    </div>

                    {/* Barra de Progresso Animada */}
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border/50">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 rounded-full"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{p.completedTasks} de {p.totalTasks} tarefas</span>
                        {p.targetDate && (
                          <span>Entrega: {new Date(p.targetDate).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhum projeto cadastrado no momento.{' '}
                <NavLink to="/projects" className="text-primary font-semibold hover:underline">
                  Cadastrar projeto
                </NavLink>
              </div>
            )}
          </div>
        </div>

        {/* Coluna 3: Carga da Equipe & Card IA Jarvis */}
        <div className="space-y-6">
          {/* Distribuição de Carga */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm double-bezel space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-border/70">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-foreground">Carga da Equipe</h2>
                <p className="text-xs text-muted-foreground">Tarefas sob responsabilidade</p>
              </div>
            </div>

            {data?.workload?.length > 0 ? (
              <div className="space-y-3">
                {data.workload.map((w: any) => (
                  <div
                    key={w.id}
                    onClick={() => navigate('/tasks')}
                    className="p-3 rounded-xl bg-secondary/40 hover:bg-secondary border border-border/60 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="h-7 w-7 rounded-lg bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {w.name?.[0] || 'U'}
                      </div>
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {w.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground shrink-0">
                      {w.taskCount} {w.taskCount === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Nenhum responsável atribuído a tarefas em andamento.
              </div>
            )}
          </div>

          {/* Card Proativo Jarvis Operacional */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-primary/20 shadow-sm double-bezel space-y-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                Jarvis AI Copilot
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O assistente operacional pode auditar seus prazos, redistribuir cargas de trabalho e resumir entregas com comandos de voz ou texto.
            </p>
            <NavLink
              to="/tasks"
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ver Sugestões Operacionais</span>
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
