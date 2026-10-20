import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router';
import { useAuth } from './contexts/auth-context';
import { AppLayout } from './components/layout/app-layout';
import { LoginPage } from './pages/login-page';
import { RegisterPage } from './pages/register-page';
import { DashboardPage } from './pages/dashboard-page';
import { TasksPage } from './pages/tasks-page';
import { ProjectsPage } from './pages/projects-page';
import { ClientsPage } from './pages/clients-page';
import { SettingsPage } from './pages/settings-page';
import { SuperAdminPage } from './pages/superadmin-page';
import { LoboFlowLogo } from './components/logo';

function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-4">
        <LoboFlowLogo className="h-10 w-auto animate-pulse" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Carregando LoboFlow...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function SuperAdminOnlyRoute() {
  const { user } = useAuth();
  if (!user?.isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <SuperAdminPage />;
}

function PublicAuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return null;
  }
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route
        path="/login"
        element={
          <PublicAuthRoute>
            <LoginPage />
          </PublicAuthRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicAuthRoute>
            <RegisterPage />
          </PublicAuthRoute>
        }
      />

      {/* Rotas Autenticadas Protegidas */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/superadmin" element={<SuperAdminOnlyRoute />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
