'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi, toList } from '../admin-client';
import type { Admin, AdminList, AdminFilters } from '../types';

export async function loadAllAdmins(): Promise<AdminList> {
  const items: Admin[] = [];
  while (true) {
    const page = toList<Admin>(await adminApi.get('/v1/admin/admins', { skip: items.length, limit: 100 }));
    items.push(...page.items);
    if (!page.items.length || page.items.length < (page.limit || 100)) return { items, skip: 0, limit: 100 };
  }
}

// useAdmins — list view (US-dev-ADM-001 + US-dev-ADM-003 for action refresh).
// Mirrors useAdminPlaces pattern (custom useState + useEffect + useCallback,
// no react-query — that's the dashboard's house style).
export function useAdmins(filters: AdminFilters, all = false) {
  const filterKey = JSON.stringify(filters);
  const [data, setData] = useState<AdminList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = all ? await loadAllAdmins() : toList<Admin>(await adminApi.get('/v1/admin/admins', JSON.parse(filterKey) as Record<string, string | number | null | undefined>));
      setData(result as AdminList);
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

// useAdmin — edit view (US-dev-ADM-002).
export function useAdmin(id: string) {
  const [data, setData] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await adminApi.get<Admin>(`/v1/admin/admins/${id}`);
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
