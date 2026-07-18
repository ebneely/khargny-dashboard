'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi, toList } from '../admin-client';
import type { AdminPlaceList, AdminPlaceFilters, AdminPlace } from '../types';

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
      const result = await adminApi.get<unknown>('/v1/admin/places', filters as any);
      setData(toList<AdminPlace>(result) as AdminPlaceList);
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

export function useAdminPlace(id: string) {
  const [data, setData] = useState<AdminPlace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      // GET /v1/admin/places/:id returns { place, imageCount, videoCount } — unwrap to the
      // place itself (the edit form reads place.name/cityId/... directly). Without this the
      // form never populates ("edit doesn't load").
      const result = await adminApi.get<AdminPlace | { place: AdminPlace }>(
        `/v1/admin/places/${id}`,
      );
      const place = (result as { place?: AdminPlace })?.place ?? (result as AdminPlace);
      setData(place);
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
