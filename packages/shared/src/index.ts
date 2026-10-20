export * from './permissions';
export * from './domain';

/** Formato padronizado de erro devolvido pela API. */
export interface ApiErrorBody {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  emailVerified: boolean;
  theme: 'light' | 'dark' | 'system';
  timezone: string | null;
}

export interface MembershipSummary {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationStatus: 'ACTIVE' | 'SUSPENDED';
  roleId: string;
  roleName: string;
  isOwner: boolean;
}

export interface ActiveOrganizationContext {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  enabledModules: string[];
  onboardingCompleted: boolean;
  role: { id: string; name: string; isOwner: boolean };
  /** permissão → escopo */
  permissions: Record<string, 'ALL' | 'ASSIGNED' | 'OWN'>;
}

export interface MeResponse {
  user: SessionUser;
  memberships: MembershipSummary[];
}
