'use client';

import * as React from 'react';

export function useSubscriberResource<T>(load: () => Promise<T>, revision?: unknown) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [savedRefreshFailed, setSavedRefreshFailed] = React.useState(false);
  const generation = React.useRef(0);
  const invalidate = React.useCallback(() => { generation.current++; }, []);
  const refetch = React.useCallback(async () => {
    const requestId = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const result = await load();
      if (requestId !== generation.current) return false;
      setData(result);
      setSavedRefreshFailed(false);
      return true;
    } catch (caught) {
      if (requestId === generation.current) setError(caught instanceof Error ? caught : new Error('Request failed.'));
      return false;
    } finally {
      if (requestId === generation.current) setLoading(false);
    }
  }, [load]);
  const refreshAfterSave = React.useCallback(() => {
    setSavedRefreshFailed(true);
    return refetch();
  }, [refetch]);
  React.useEffect(() => {
    const timer = window.setTimeout(() => { void refetch(); }, 250);
    return () => { window.clearTimeout(timer); invalidate(); };
  }, [refetch, invalidate, revision]);
  return { data, loading, error, refetch, refreshAfterSave, savedRefreshFailed };
}
