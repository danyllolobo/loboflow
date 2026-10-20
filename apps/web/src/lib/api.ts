import { ApiErrorBody } from '@loboflow/shared';

const BASE_URL = '/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const activeOrgId = localStorage.getItem('loboflow_active_org_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (activeOrgId && !headers['x-organization-id']) {
    headers['x-organization-id'] = activeOrgId;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include', // Envia e recebe cookie HttpOnly loboflow_session
  });

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorBody = data as ApiErrorBody;
    throw new ApiError(
      response.status,
      errorBody.code || 'UNKNOWN_ERROR',
      errorBody.message || 'Ocorreu uma falha na requisição',
      errorBody.details,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(url: string, headers?: Record<string, string>) =>
    request<T>(url, { method: 'GET', headers }),

  post: <T>(url: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(url, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    }),

  patch: <T>(url: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(url, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    }),

  delete: <T>(url: string, headers?: Record<string, string>) =>
    request<T>(url, { method: 'DELETE', headers }),
};
