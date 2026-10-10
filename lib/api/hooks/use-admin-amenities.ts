'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../admin-client';
import type { AdminAmenity } from '../types';

export function useAdminAmenities(enabled = true) {
  const [data, setData] = useState<AdminAmenity[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await adminApi.get<AdminAmenity[]>('/v1/admin/amenities');
      setData(result);
    } catch (e) {
      setIsError(true);
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { let subscribed = true; queueMicrotask(() => { if (subscribed && enabled) void fetch(); }); return () => { subscribed = false; }; }, [fetch, enabled]);

  return { data, isLoading, isError, error, refetch: fetch };
}

export function useAdminAmenity(id: string) {
  const [data, setData] = useState<AdminAmenity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await adminApi.get<AdminAmenity>(`/v1/admin/amenities/${id}`);
      setData(result);
    } catch (e) {
      setIsError(true);
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { let subscribed = true; queueMicrotask(() => { if (subscribed) void fetch(); }); return () => { subscribed = false; }; }, [fetch]);

  return { data, isLoading, isError, error, refetch: fetch };
}
