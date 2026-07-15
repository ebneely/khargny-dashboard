'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CurrentSession {
  user: {
    id: string;
    email: string;
    role: 'super_admin' | 'editor' | 'viewer' | string;
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

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await window.fetch('/api/auth/session', { credentials: 'include' });
      if (!res.ok) {
        setIsError(true);
        return;
      }
      const json = (await res.json()) as CurrentSession;
      setData(json);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { data, isLoading, isError, refetch: fetchSession };
}
