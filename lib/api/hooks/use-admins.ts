'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../admin-client';
import type { Admin, AdminList, AdminFilters } from '../types';

// useAdmins — list view (US-dev-ADM-001 + US-dev-ADM-003 for action refresh).
// Mirrors useAdminPlaces pattern (custom useState + useEffect + useCallback,
// no react-query — that's the dashboard's house style).
export function useAdmins(filters: AdminFilters) {
  const [data, setData] = useState<AdminList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await adminApi.get<AdminList>('/v1/admin/admins', filters as Record<string, string | number | null | undefined>);
      setData(result);
    } catch (e) {
      setIsError(true);
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    fetch();
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
    fetch();
  }, [fetch]);

  return { data, isLoading, isError, error, refetch: fetch };
}
