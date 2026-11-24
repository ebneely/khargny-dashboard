'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../admin-client';
import type { AdminCategory } from '../types';

export function useAdminCategories() {
  const [data, setData] = useState<AdminCategory[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => adminApi.get<AdminCategory[]>('/v1/admin/categories'), []);

  // State is written only from the request's callbacks, never synchronously in an effect.
  const track = useCallback((request: Promise<AdminCategory[]>) => {
    request
      .then((result) => setData(result))
      .catch((e) => {
        setIsError(true);
        setError(e as Error);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { track(load()); }, [track, load]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    track(load());
  }, [track, load]);

  return { data, isLoading, isError, error, refetch };
}

export function useAdminCategory(id: string) {
  const [data, setData] = useState<AdminCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(() => adminApi.get<AdminCategory>(`/v1/admin/categories/${id}`), [id]);

  const track = useCallback((request: Promise<AdminCategory | null>) => {
    request
      .then((result) => setData(result))
      .catch((e) => {
        setIsError(true);
        setError(e as Error);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { if (id) track(load()); }, [track, load, id]);

  const refetch = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    track(load());
  }, [track, load, id]);

  return { data, isLoading, isError, error, refetch };
}
