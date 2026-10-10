'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi, toList } from '../admin-client';
import type { AdminCityList, AdminCityFilters, AdminCity } from '../types';

export async function loadAllCities(filters: AdminCityFilters = {}): Promise<AdminCityList> {
  const result = toList<AdminCity>(await adminApi.get('/v1/admin/cities', { ...filters, skip: 0, limit: 100 }));
  while (result.items.length < result.total) {
    const page = toList<AdminCity>(await adminApi.get('/v1/admin/cities', { ...filters, skip: result.items.length, limit: 100 }));
    if (!page.items.length) throw new Error('Incomplete city list');
    result.items.push(...page.items);
  }
  return result as AdminCityList;
}

export function useAdminCities(filters: AdminCityFilters, all = false) {
  const filterKey = JSON.stringify(filters);
  const [data, setData] = useState<AdminCityList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const query = JSON.parse(filterKey) as AdminCityFilters;
      const result = all ? await loadAllCities(query) : toList<AdminCity>(await adminApi.get('/v1/admin/cities', query as Record<string, string | number | null | undefined>));
      setData(result as AdminCityList);
    } catch (e) {
      setIsError(true);
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [filterKey, all]);

  useEffect(() => {
    let subscribed = true;
    queueMicrotask(() => { if (subscribed) void fetch(); });
    return () => { subscribed = false; };
  }, [fetch]);

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

  useEffect(() => {
    const timer = window.setTimeout(() => { void fetch(); }, 0);
    return () => window.clearTimeout(timer);
  }, [fetch]);

  return { data, isLoading, isError, error, refetch: fetch };
}
