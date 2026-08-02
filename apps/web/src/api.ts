const API_BASE = '/api/v1';

export interface ApiMeta {
  request_id: string;
  next_cursor?: string;
  count?: number;
  duration_ms?: number;
}

export interface ApiEnvelope<T> {
  data: T;
  meta: ApiMeta;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });
  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { error?: { message?: string; code?: string } }
    | null;

  if (!response.ok) {
    const errorBody = body as { error?: { message?: string; code?: string } };
    throw new ApiError(
      errorBody?.error?.message ?? 'Request failed',
      response.status,
      errorBody?.error?.code,
    );
  }

  return body as ApiEnvelope<T>;
}

export async function fetchApiEnvelope<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiEnvelope<T>> {
  return request<T>(endpoint, options);
}

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  return (await request<T>(endpoint, options)).data;
}

export async function loginAdmin(token: string) {
  return fetchApi<{ authenticated: boolean }>('/admin/session', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function getAdminSession() {
  return fetchApi<{ authenticated: boolean }>('/admin/session');
}

export async function logoutAdmin() {
  return fetchApi<{ authenticated: boolean }>('/admin/session', {
    method: 'DELETE',
  });
}
