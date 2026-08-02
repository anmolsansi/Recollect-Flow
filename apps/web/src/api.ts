/* eslint-disable @typescript-eslint/no-explicit-any */
const API_BASE = '/api/v1';

export async function loginAdmin(token: string) {
  const res = await fetch(`${API_BASE}/admin/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Invalid token');
  return res.json();
}

export async function logoutAdmin() {
  const res = await fetch(`${API_BASE}/admin/session`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Logout failed');
  return res.json();
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  if (
    !headers.has('Content-Type') &&
    options.body &&
    typeof options.body === 'string'
  ) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!res.ok) {
    let message = 'An error occurred';
    try {
      const err = (await res.json()) as any;
      message = err.error?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = (await res.json()) as any;
  return json.data;
}
