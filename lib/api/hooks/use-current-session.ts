'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CurrentSession {
  user: {
    id: string;
    email: string;
    role: 'super_admin' | 'admin' | 'viewer' | string;
  };
  session: {
    id: string;
    expiresAt: string;
  };
}

// useCurrentSession — reads the current admin from /api/auth/session
// (which decodes the JWT in the cookie). Used to identify the "self row"
// in the admins list so the Disable button is disabled on the row the
// current user can't act on.
export function useCurrentSession() {
  const [data, setData] = useState<CurrentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const request = useCallback(async (): Promise<CurrentSession | null> => {
    let res = await window.fetch('/api/auth/session', { credentials: 'include' });
    // The access token lives ~15min. When it expires /api/auth/session 401s; rather
    // than stick on the loading skeleton forever, try a one-shot refresh (the backend
    // issues a new pair from the refresh_token cookie) and re-fetch once.
    if (res.status === 401) {
      const refreshed = await window.fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshed.ok) {
        res = await window.fetch('/api/auth/session', { credentials: 'include' });
      }
    }
    if (!res.ok) return null;
    // /api/auth/session wraps the payload in an envelope:
    // { success: true, data: { user, session } }. Unwrap to the
    // CurrentSession shape every consumer expects (session.user.*).
    const json = (await res.json()) as { success?: boolean; data?: CurrentSession };
    return json?.data?.user ? json.data : null;
  }, []);

  // State is written only from the request's callbacks, never synchronously in an effect.
  const track = useCallback((pending: Promise<CurrentSession | null>) => {
    pending
      .then((result) => {
        if (result) setData(result);
        else setIsError(true);
      })
      .catch(() => setIsError(true))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { track(request()); }, [track, request]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    track(request());
  }, [track, request]);

  return { data, isLoading, isError, refetch };
}
