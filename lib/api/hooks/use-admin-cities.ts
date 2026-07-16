'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi, toList } from '../admin-client';
import type { AdminCityList, AdminCityFilters, AdminCity } from '../types';

export function useAdminCities(filters: AdminCityFilters) {
  const [data, setData] = useState<AdminCityList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await adminApi.get<unknown>('/v1/admin/cities', filters as any);
      setData(toList<AdminCity>(result) as AdminCityList);
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

export function useAdminCity(id: string) {
  const [data, setData] = useState<AdminCity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await adminApi.get<AdminCity>(`/v1/admin/cities/${id}`);
      setData(result);
    } catch (e) {
      setIsError(true);
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, isLoading, isError, error, refetch: fetch };
}
