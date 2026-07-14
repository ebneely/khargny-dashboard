import { API_BASE_URL } from '@/lib/config';

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, body: { error?: { code?: string; message?: string } } | null) {
    super(body?.error?.message || `Request failed with status ${status}`);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = body?.error?.code || 'UNKNOWN_ERROR';
  }
}

function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(method: string, path: string, opts?: { body?: unknown; params?: Record<string, string | number | undefined | null> }): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (opts?.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    credentials: 'include',
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let payload: T | { success: false; error: { code: string; message: string } } | null = null;
  try { payload = await res.json(); } catch { payload = null; }

  if (!res.ok || !payload || (payload as any).success === false) {
    throw new AdminApiError(res.status, payload as any);
  }

  return (payload as any).data ?? payload;
}

export const adminApi = {
  get: <T>(path: string, params?: Record<string, string | number | undefined | null>) =>
    request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown) =>
    request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, { body }),
  delete: <T>(path: string) =>
    request<T>('DELETE', path),
};
