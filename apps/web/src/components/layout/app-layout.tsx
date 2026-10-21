import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, Link, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/auth-context';
import { useTheme } from '../../contexts/theme-context';
import { LoboFlowLogo } from '../logo';
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Users2,
  Bot,
  Settings,
  ShieldAlert,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
  Plus,
  FileText,
  TrendingUp,
  Search,
  Menu,
  X,
  Sparkles,
  Command as CommandIcon,
} from 'lucide-react';
import { JarvisDrawer } from '../jarvis/jarvis-drawer';
import { CommandPalette } from '../command-palette';

export function AppLayout() {
  const { user, activeOrg, memberships, switchOrganization, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [jarvisOpen, setJarvisOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
      <aside className="hidden md:flex flex-col w-60 border-r border-border/80 bg-card/60 backdrop-blur-md">
        {/* Header da Sidebar */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-border/70">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <LoboFlowLogo className="h-7 w-auto max-w-[140px]" />
          </NavLink>
        </div>

        {/* Seletor de Organização Multi-Tenant */}
        <div className="p-2.5 border-b border-border/70 relative z-30">
          <button
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg bg-secondary/80 hover:bg-secondary border border-border/80 transition-colors shadow-2xs cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <div className="h-5 w-5 rounded bg-primary/15 text-primary flex items-center justify-center font-bold text-[10px] uppercase shrink-0">
                {activeOrg?.organizationName?.[0] || 'L'}
              </div>
              <span className="font-semibold text-foreground truncate text-xs">
                {activeOrg?.organizationName || 'Selecione a empresa'}
              </span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {orgDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOrgDropdownOpen(false)}
              />
              <div className="absolute top-full left-2.5 right-2.5 mt-1 p-1 bg-card border border-border rounded-xl shadow-xl z-50 space-y-0.5">
                <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Minhas Organizações
                </div>
                <div className="max-h-52 overflow-y-auto space-y-0.5">
                  {memberships.map((m) => (
                    <button
                      key={m.organizationId}
                      onClick={() => {
                        switchOrganization(m.organizationId);
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md flex items-center justify-between hover:bg-secondary transition-colors cursor-pointer ${
                        m.organizationId === activeOrg?.organizationId
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-foreground'
                      }`}
                    >
                      <span className="truncate">{m.organizationName}</span>
                      <span className="text-[10px] text-muted-foreground ml-2 px-1 rounded bg-secondary/80 shrink-0">
                        {m.roleName}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="pt-1 mt-1 border-t border-border/60">
                  <NavLink
                    to="/settings?tab=organizations&create=true"
                    onClick={() => setOrgDropdownOpen(false)}
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-md flex items-center gap-2 text-primary hover:bg-primary/10 font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Nova Empresa</span>
                  </NavLink>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Botão de Busca Rápida (Cmd+K) */}
        <div className="px-2.5 pt-2">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg bg-secondary/40 hover:bg-secondary border border-border/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Buscar...</span>
            </div>
            <kbd className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border border-border/80">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navegação Principal */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}

          {/* Destaque para Jarvis */}
          <div className="pt-3">
            <button
              onClick={() => setJarvisOpen(true)}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-gradient-to-r from-sky-500/10 to-cyan-500/10 border border-sky-500/20 text-sky-400 hover:border-sky-400/50 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold leading-tight text-foreground group-hover:text-sky-400 transition-colors">Jarvis IA</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">Copilot Operacional</div>
                </div>
              </div>
              <Sparkles className="h-3 w-3 text-sky-400" />
            </button>
          </div>
        </nav>

        {/* Footer do Usuário & Tema */}
        <div className="p-2.5 border-t border-border/70 flex items-center justify-between">
          <Link
            to="/settings?tab=profile"
            className="flex items-center gap-2 truncate flex-1 hover:opacity-90 transition-opacity p-1 rounded-md hover:bg-secondary/50 cursor-pointer"
            title="Editar meu perfil e senha"
          >
            <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="truncate text-left">
              <div className="text-xs font-medium truncate text-foreground leading-tight">{user?.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          </Link>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Alternar tema"
            >
              {resolvedTheme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Sair"
            >
              <LogOut className="h-3.5 w-3.5" />
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
              onClick={() => setCommandPaletteOpen(true)}
              className="p-2 text-muted-foreground hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">
          <Outlet />
        </main>
      </div>

      {/* Drawer do Jarvis IA */}
      <JarvisDrawer open={jarvisOpen} onClose={() => setJarvisOpen(false)} />

      {/* Paleta Global de Comandos (Cmd+K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onOpenCreateTask={() => navigate('/tasks?create=true')}
        onOpenJarvis={() => setJarvisOpen(true)}
      />
    </div>
  );
}
