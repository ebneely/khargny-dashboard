'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../admin-client';

export interface AnalyticsTotals {
  places: number;
  cities: number;
  categories: number;
  draftPlaces: number;
  views: number;
  saves: number;
  directions: number;
}

export interface AnalyticsBreakdownRow {
  key: string;
  labelAr: string | null;
  labelEn: string | null;
  places: number;
  views: number;
  saves: number;
  directions: number;
}

export interface AnalyticsTopPlace {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  region: string | null;
  cityAr: string | null;
  cityEn: string | null;
  views: number;
  saves: number;
  directions: number;
}

export interface AnalyticsOverview {
  totals: AnalyticsTotals;
  byCity: AnalyticsBreakdownRow[];
  byRegion: AnalyticsBreakdownRow[];
  topPlaces: AnalyticsTopPlace[];
  meta: { basis: string; note: string };
}

/**
 * GET /v1/admin/analytics/overview — the aggregates behind the home insights.
 *
 * Follows the same hand-rolled fetch shape as the other admin hooks in this folder rather
 * than introducing a second data-fetching idiom for one screen.
 */
export function useAnalyticsOverview() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await adminApi.get<AnalyticsOverview>('/v1/admin/analytics/overview');
      setData(result ?? null);
    } catch (e) {
      setIsError(true);
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, isError, error, refetch: fetch };
}
