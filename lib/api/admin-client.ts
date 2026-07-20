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

// Access-token refresh, SINGLE-FLIGHT. The access token lives ~1h; without a refresh,
// any admin request after it expires returns 401 "Unauthorized" — even for a super_admin.
//
// Critically, the backend ROTATES refresh tokens: /v1/auth/refresh revokes the old
// refresh token and issues a new one. The edit page fires ~7 queries in parallel
// (place, amenities, tags, hours, media, cities, categories); when the access token
// expires they all 401 at once. If each fired its own /api/auth/refresh, the first
// would rotate the token and the rest would present the now-revoked token → the
// dashboard route clears the cookies → the admin is logged out. That is the
// "session expires after so short a time / Session expired / Failed to load place"
// bug. Sharing ONE in-flight refresh promise across all concurrent 401s fixes it.
let refreshInFlight: Promise<boolean> | null = null;

function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
        return r.ok;
      } catch {
        return false;
      }
    })().finally(() => {
      // Concurrent 401s from the same burst all captured this promise synchronously
      // before it settled, so they share the single refresh; clear once it settles.
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * The session is genuinely gone (refresh failed / refresh token revoked or expired).
 * Send the admin to the login screen instead of letting a save fail silently — the
 * previous behaviour surfaced a generic error and the admin walked away believing
 * their changes were saved. `next` brings them back to the page they were on.
 *
 * Guarded so we redirect once and never loop while already on /login.
 */
let redirectingToLogin = false;

function handleSessionExpired(): void {
  if (typeof window === 'undefined' || redirectingToLogin) return;
  const { pathname, search } = window.location;
  if (pathname.startsWith('/login')) return;
  redirectingToLogin = true;
  // The login page reads `redirect` — keep its convention so we return here after.
  const redirect = encodeURIComponent(`${pathname}${search}`);
  window.location.assign(`/login?reason=expired&redirect=${redirect}`);
}

async function doFetch(method: string, url: string, opts?: { body?: unknown }) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, {
    method,
    credentials: 'include',
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

async function request<T>(method: string, path: string, opts?: { body?: unknown; params?: Record<string, string | number | undefined | null> }): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);
  if (opts?.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }

  let res = await doFetch(method, url.toString(), opts);

  // 401 → the access token likely expired. Refresh once and retry the same request.
  if (res.status === 401) {
    if (await tryRefresh()) {
      res = await doFetch(method, url.toString(), opts);
    }
    // Still 401 after a refresh attempt → the session is really gone. Redirect to
    // login rather than surfacing a generic error the admin mistakes for a save.
    if (res.status === 401) {
      handleSessionExpired();
    }
  }

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

// Multipart upload — sends FormData with the auth token but lets the browser
// set the multipart Content-Type/boundary. Used for media image/video uploads.
async function upload<T>(path: string, form: FormData): Promise<T> {
  const send = () => {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers,
      body: form,
    });
  };

  // Same 401 → refresh → retry-once flow as request(). Without it, a photo upload
  // after the ~15min access token expired returned "Unauthorized" and never
  // recovered — the "Failed to upload image… / Unauthorized on retry" bug.
  let res = await send();
  if (res.status === 401 && (await tryRefresh())) {
    res = await send();
  }

  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (
    !res.ok ||
    !payload ||
    (payload as { success?: boolean }).success === false
  ) {
    throw new AdminApiError(
      res.status,
      payload as { error?: { code?: string; message?: string } } | null,
    );
  }
  return ((payload as { data?: T }).data ?? payload) as T;
}

// Multipart upload with progress. fetch() can't report upload progress, so this
// uses XMLHttpRequest. Reports 0→100 via onProgress, and on a 401 refreshes the
// token once (single-flight, shared with request()) and retries.
async function uploadWithProgress<T>(
  path: string,
  form: FormData,
  onProgress?: (percent: number) => void,
): Promise<T> {
  const send = () =>
    new Promise<{ status: number; body: unknown }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}${path}`);
      xhr.withCredentials = true;
      const token = getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => {
        let body: unknown = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          body = null;
        }
        resolve({ status: xhr.status, body });
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(form);
    });

  let res = await send();
  if (res.status === 401) {
    if (await tryRefresh()) {
      res = await send();
    }
    if (res.status === 401) handleSessionExpired();
  }
  const ok = res.status >= 200 && res.status < 300;
  if (!ok || !res.body || (res.body as { success?: boolean }).success === false) {
    throw new AdminApiError(
      res.status,
      res.body as { error?: { code?: string; message?: string } } | null,
    );
  }
  onProgress?.(100);
  return ((res.body as { data?: T }).data ?? res.body) as T;
}

export const adminApi = {
  get: <T>(path: string, params?: Record<string, string | number | undefined | null>) =>
    request<T>('GET', path, { params }),
  post: <T>(path: string, body?: unknown) =>
    request<T>('POST', path, { body }),
  upload,
  uploadWithProgress,
  put: <T>(path: string, body?: unknown) =>
    request<T>('PUT', path, { body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>('PATCH', path, { body }),
  delete: <T>(path: string) =>
    request<T>('DELETE', path),
};
