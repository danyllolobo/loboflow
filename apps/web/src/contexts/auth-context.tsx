import React, { createContext, useContext, useEffect, useState } from 'react';
import { MeResponse, MembershipSummary, SessionUser } from '@loboflow/shared';
import { api } from '../lib/api';
import { LoginInput, RegisterInput } from '@loboflow/validation';

interface AuthContextType {
  user: SessionUser | null;
  memberships: MembershipSummary[];
  activeOrg: MembershipSummary | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [memberships, setMemberships] = useState<MembershipSummary[]>([]);
  const [activeOrg, setActiveOrg] = useState<MembershipSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const data = await api.get<MeResponse>('/auth/me');
      setUser(data.user);
      setMemberships(data.memberships);

      // Restaura ou define a organização ativa
      const savedOrgId = localStorage.getItem('loboflow_active_org_id');
      const found = data.memberships.find((m) => m.organizationId === savedOrgId);
      const chosen = found || data.memberships[0] || null;

      if (chosen) {
        localStorage.setItem('loboflow_active_org_id', chosen.organizationId);
        setActiveOrg(chosen);
      } else {
        localStorage.removeItem('loboflow_active_org_id');
        setActiveOrg(null);
      }
    } catch {
      setUser(null);
      setMemberships([]);
      setActiveOrg(null);
      localStorage.removeItem('loboflow_active_org_id');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (input: LoginInput) => {
    await api.post('/auth/login', input);
    await refreshMe();
  };

  const register = async (input: RegisterInput) => {
    const res = await api.post<{ user: SessionUser; organization: { id: string } }>(
      '/auth/register',
      input,
    );
    if (res?.organization?.id) {
      localStorage.setItem('loboflow_active_org_id', res.organization.id);
    }
    await refreshMe();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
      setMemberships([]);
      setActiveOrg(null);
      localStorage.removeItem('loboflow_active_org_id');
      window.location.href = '/login';
    }
  };

  const switchOrganization = (orgId: string) => {
    const found = memberships.find((m) => m.organizationId === orgId);
    if (found) {
      localStorage.setItem('loboflow_active_org_id', found.organizationId);
      setActiveOrg(found);
      window.location.reload(); // Recarrega para reinicializar o contexto dos módulos
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        activeOrg,
        isLoading,
        login,
        register,
        logout,
        switchOrganization,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
