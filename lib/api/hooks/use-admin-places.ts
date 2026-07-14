'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../admin-client';
import type { AdminPlaceList, AdminPlaceFilters } from '../types';

export function useAdminPlaces(filters: AdminPlaceFilters) {
  const [data, setData] = useState<AdminPlaceList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await adminApi.get<AdminPlaceList>('/v1/admin/places', filters as any);
      setData(result);
    } catch (e) {
      setIsError(true);
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, isError, error, refetch: fetch };
}
