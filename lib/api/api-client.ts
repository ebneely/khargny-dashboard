import { adminApi, AdminApiError } from './admin-client';
import { API_BASE_URL } from '@/lib/config';

const REFRESH_PATH = '/api/auth/refresh';

let refreshPromise: Promise<boolean> | null = null;

function clearAuthCookiesAndRedirect() {
  if (typeof document === 'undefined') return;
  const expired = 'path=/; max-age=0';
  document.cookie = `session_token=; ${expired}`;
  document.cookie = `refresh_token=; ${expired}`;
  document.cookie = `token=; ${expired}`;
  const redirect = encodeURIComponent(window.location.pathname);
  window.location.href = `/login?redirect=${redirect}`;
}

async function attemptRefresh(): Promise<boolean> {
  try {
    const res = await fetch(REFRESH_PATH, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

function getRefreshPromise(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = attemptRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestArgs {
  method: ApiMethod;
  path: string;
  body?: unknown;
  params?: Record<string, string | number | undefined | null>;
}

async function rawRequest<T>(args: RequestArgs): Promise<T> {
  switch (args.method) {
    case 'GET':
      return adminApi.get<T>(args.path, args.params);
    case 'POST':
      return adminApi.post<T>(args.path, args.body);
    case 'PATCH':
      return adminApi.patch<T>(args.path, args.body);
    case 'DELETE':
      return adminApi.delete<T>(args.path);
  }
}

export async function request<T>(args: RequestArgs): Promise<T> {
  try {
    return await rawRequest<T>(args);
  } catch (err) {
    if (!(err instanceof AdminApiError) || err.status !== 401) {
      throw err;
    }
    if (err.code !== 'TOKEN_EXPIRED') {
      throw err;
    }

    const refreshed = await getRefreshPromise();
    if (!refreshed) {
      clearAuthCookiesAndRedirect();
      throw err;
    }

    try {
      return await rawRequest<T>(args);
    } catch (retryErr) {
      if (retryErr instanceof AdminApiError && retryErr.status === 401) {
        clearAuthCookiesAndRedirect();
      }
      throw retryErr;
    }
  }
}

export { API_BASE_URL };
