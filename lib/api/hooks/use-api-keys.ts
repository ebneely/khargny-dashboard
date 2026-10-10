'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi } from '../admin-client';
import { publicApiKey, type ApiKeyList } from '../api-keys';

export function useApiKeys(page: number, all = false) {
  const [data, setData] = useState<ApiKeyList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const requests = useRef({ generation: 0 });

  const refetch = useCallback(async () => {
    const request = ++requests.current.generation;
    setIsLoading(true);
    setIsError(false);
    try {
      const result = await adminApi.get<ApiKeyList>('/v1/admin/api-keys', { page: all ? 1 : page, limit: 25 });
      if (all) {
        let nextPage = 2;
        let hasMore = result.meta.has_more;
        while (hasMore) {
          const next = await adminApi.get<ApiKeyList>('/v1/admin/api-keys', { page: nextPage++, limit: 25 });
          if (!next.data.length) throw new Error('Incomplete key list');
          result.data.push(...next.data);
          hasMore = next.meta.has_more;
        }
        result.meta = { ...result.meta, total: result.data.length, has_more: false };
      }
      if (request !== requests.current.generation) return;
      setData({ ...result, data: result.data.map(publicApiKey) });
    } catch {
      if (request === requests.current.generation) setIsError(true);
    } finally {
      if (request === requests.current.generation) setIsLoading(false);
    }
  }, [page, all]);

  useEffect(() => {
    const state = requests.current;
    let subscribed = true;
    queueMicrotask(() => { if (subscribed) void refetch(); });
    return () => { subscribed = false; state.generation++; };
  }, [refetch]);

  return { data, isLoading, isError, refetch };
}
