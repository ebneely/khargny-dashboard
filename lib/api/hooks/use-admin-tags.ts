'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi, toList } from '../admin-client';
import type { AdminTag } from '../types';

export function useAdminTags(enabled = true) {
  const [data, setData] = useState<AdminTag[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const rows: AdminTag[] = [];
      while (true) {
        const page = toList<AdminTag>(await adminApi.get('/v1/admin/tags', { skip: rows.length, limit: 200 }));
        rows.push(...page.items);
        if (rows.length >= page.total) break;
        if (!page.items.length) throw new Error('Incomplete keyword list');
      }
      setData(rows);
    } catch (e) {
      setIsError(true);
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let subscribed = true;
    queueMicrotask(() => { if (subscribed && enabled) void fetch(); });
    return () => { subscribed = false; };
  }, [fetch, enabled]);

  return { data, isLoading, isError, error, refetch: fetch };
}

export function useAdminTag(id: string) {
  const [data, setData] = useState<AdminTag | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await adminApi.get<AdminTag>(`/v1/admin/tags/${id}`);
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
