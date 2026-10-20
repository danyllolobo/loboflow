import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../contexts/auth-context';
import { useTheme } from '../../contexts/theme-context';
import { LoboFlowLogo } from '../logo';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users2,
  Building2,
  Bot,
  Settings,
  ShieldAlert,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  FileText,
  TrendingUp,
  Search,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { JarvisDrawer } from '../jarvis/jarvis-drawer';

export function AppLayout() {
  const { user, activeOrg, memberships, switchOrganization, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [jarvisOpen, setJarvisOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tasks', label: 'Tarefas', icon: CheckSquare },
    { to: '/projects', label: 'Projetos', icon: FolderKanban },
    { to: '/clients', label: 'Clientes', icon: Users2 },
    { to: '/scripts', label: 'Roteiros', icon: FileText },
    { to: '/commercial', label: 'Comercial', icon: TrendingUp },
    { to: '/settings', label: 'Configurações', icon: Settings },
  ];

  if (user?.isSuperAdmin) {
    navItems.push({ to: '/superadmin', label: 'SuperAdmin', icon: ShieldAlert });
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/60 backdrop-blur-md">
        {/* Header da Sidebar com a Logo Oficial */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <LoboFlowLogo className="h-8 w-auto max-w-[150px]" />
          </NavLink>
        </div>

        {/* Seletor de Organização Multi-Tenant */}
        <div className="p-3 border-b border-border/70 relative z-30">
          <button
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-xl bg-secondary hover:bg-secondary/80 border border-border transition-all shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="h-6 w-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs uppercase">
                {activeOrg?.organizationName?.[0] || 'L'}
              </div>
              <span className="font-semibold text-foreground truncate text-xs">
                {activeOrg?.organizationName || 'Selecione a empresa'}
              </span>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {orgDropdownOpen && (
            <>
              {/* Backdrop invisível para fechar ao clicar fora */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOrgDropdownOpen(false)}
              />
              <div className="absolute top-full left-3 right-3 mt-1.5 p-1.5 bg-card border border-border rounded-xl shadow-2xl z-50 double-bezel space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Minhas Organizações
                </div>
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {memberships.map((m) => (
                    <button
                      key={m.organizationId}
                      onClick={() => {
                        switchOrganization(m.organizationId);
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer ${
                        m.organizationId === activeOrg?.organizationId
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-foreground'
                      }`}
                    >
                      <span className="truncate">{m.organizationName}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 px-1.5 py-0.5 rounded bg-secondary/80 shrink-0">
                        {m.roleName}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {/* Botão de Destaque para o Jarvis */}
          <div className="pt-4">
            <button
              onClick={() => setJarvisOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-gradient-to-r from-sky-500/10 via-cyan-500/10 to-blue-500/10 border border-sky-500/30 text-sky-400 hover:border-sky-400 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold leading-none">Jarvis IA</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Assistente Operacional</div>
                </div>
              </div>
              <Sparkles className="h-3.5 w-3.5 text-sky-400 animate-pulse" />
            </button>
          </div>
        </nav>

        {/* Footer do Usuário & Tema */}
        <div className="p-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="truncate text-left">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Alternar tema claro/escuro"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar Mobile */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-card">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <LoboFlowLogo className="h-7 w-auto max-w-[120px]" />
          </NavLink>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setJarvisOpen(true)}
              className="p-2 text-sky-400 bg-sky-500/10 rounded-md"
            >
              <Bot className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-muted-foreground"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Menu Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-card border-b border-border p-4 space-y-2 z-50">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-secondary"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <div className="pt-2 border-t border-border flex justify-between items-center">
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="text-xs text-muted-foreground flex items-center gap-2"
              >
                {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                Tema {resolvedTheme === 'dark' ? 'Claro' : 'Escuro'}
              </button>
              <button onClick={logout} className="text-xs text-destructive flex items-center gap-1">
                <LogOut className="h-3.5 w-3.5" /> Sair
              </button>
            </div>
          </div>
        )}

        {/* Viewport da Página */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Drawer do Jarvis IA */}
      <JarvisDrawer open={jarvisOpen} onClose={() => setJarvisOpen(false)} />
    </div>
  );
}
