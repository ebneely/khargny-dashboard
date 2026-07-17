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

// Backend paginated list endpoints return { data: T[], meta: { page, limit,
// total, total_pages, has_more } } (the response interceptor's outer envelope
// is already stripped by request()). The dashboard's list hooks/pages expect
// { items, total, skip, limit }. toList bridges the two shapes; without it
// data.items is undefined and the page render throws.
export interface NormalizedList<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export function toList<T>(raw: unknown): NormalizedList<T> {
  const r = raw as
    | { data?: T[]; meta?: { page?: number; limit?: number; total?: number } }
    | T[]
    | { items?: T[]; total?: number; skip?: number; limit?: number }
    | null
    | undefined;

  // Paginated backend shape: { data: [...], meta: {...} }
  if (r && !Array.isArray(r) && Array.isArray((r as { data?: T[] }).data)) {
    const paged = r as { data: T[]; meta?: { page?: number; limit?: number; total?: number } };
    const limit = Number(paged.meta?.limit ?? paged.data.length);
    const page = Number(paged.meta?.page ?? 0);
    return {
      items: paged.data,
      total: Number(paged.meta?.total ?? paged.data.length),
      skip: page * limit,
      limit,
    };
  }

  // Already an array (non-paginated endpoint returned raw).
  if (Array.isArray(r)) {
    return { items: r, total: r.length, skip: 0, limit: r.length };
  }

  // Already normalized (defensive).
  const norm = r as { items?: T[]; total?: number; skip?: number; limit?: number } | null;
  return {
    items: norm?.items ?? [],
    total: norm?.total ?? 0,
    skip: norm?.skip ?? 0,
    limit: norm?.limit ?? 0,
  };
}

export const adminApi = {
  get: <T>(path: string, params?: Record<string, string | number | undefined | null>) =>
    request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown) =>
    request<T>('POST', path, { body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, { body }),
  delete: <T>(path: string) =>
    request<T>('DELETE', path),
};
