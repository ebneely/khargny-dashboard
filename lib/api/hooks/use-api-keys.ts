'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi } from '../admin-client';
import { publicApiKey, type ApiKeyList } from '../api-keys';

export function useApiKeys(page: number) {
  const [data, setData] = useState<ApiKeyList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const requests = useRef({ generation: 0 });

  const refetch = useCallback(async () => {
    const request = ++requests.current.generation;
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await adminApi.get<ApiKeyList>('/v1/admin/api-keys', { page, limit: 25 });
      if (request !== requests.current.generation) return;
      setData({ ...result, data: result.data.map(publicApiKey) });
    } catch {
      if (request === requests.current.generation) setIsError(true);
    } finally {
      if (request === requests.current.generation) setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const state = requests.current;
    let subscribed = true;
    queueMicrotask(() => { if (subscribed) void refetch(); });
    return () => { subscribed = false; state.generation++; };
  }, [refetch]);

  return { data, isLoading, isError, refetch };
}
