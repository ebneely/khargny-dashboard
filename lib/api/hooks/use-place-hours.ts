'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { adminApi } from '../admin-client';

// US-admin-HRS-001 — a place's weekly opening hours.
// GET  /v1/admin/places/:placeId/hours -> array of day entries
// PUT  /v1/admin/places/:placeId/hours { hours: [7 entries] } (full replace)
export interface PlaceHour {
  dayOfWeek: number; // 0=Sunday .. 6=Saturday
  openTime: string | null; // 'HH:mm'
  closeTime: string | null;
  isClosed: boolean;
}

export const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

// Normalize any partial API payload into a full, ordered 7-day array.
function toSevenDays(raw: unknown): PlaceHour[] {
  const arr = Array.isArray(raw)
    ? (raw as Array<Record<string, unknown>>)
    : [];
  const byDay = new Map<number, Record<string, unknown>>();
  for (const h of arr) byDay.set(Number(h.dayOfWeek), h);
  return Array.from({ length: 7 }, (_, d) => {
    const h = byDay.get(d);
    const open = (h?.openTime as string | null) ?? null;
    const close = (h?.closeTime as string | null) ?? null;
    return {
      dayOfWeek: d,
      // API returns 'HH:mm:ss'; the <input type="time"> wants 'HH:mm'.
      openTime: open ? open.slice(0, 5) : null,
      closeTime: close ? close.slice(0, 5) : null,
      isClosed: Boolean(h?.isClosed),
    };
  });
}

export interface UsePlaceHoursResult {
  hours: PlaceHour[];
  loading: boolean;
  isDirty: boolean;
  isSaving: boolean;
  setDay: (day: number, patch: Partial<PlaceHour>) => void;
  /** Copy one day's open/close/closed to every day — kills the per-day drudgery. */
  copyToAll: (fromDay: number) => void;
  save: () => Promise<void>;
}

export function usePlaceHours(placeId: string): UsePlaceHoursResult {
  const [hours, setHours] = useState<PlaceHour[]>(() => toSevenDays([]));
  const [loading, setLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const savedRef = useRef<string>('');

  const load = useCallback(async () => {
    if (!placeId) return;
    setLoading(true);
    try {
      const result = await adminApi.get<unknown>(
        `/v1/admin/places/${placeId}/hours`,
      );
      const seven = toSevenDays(result);
      setHours(seven);
      savedRef.current = JSON.stringify(seven);
      setIsDirty(false);
    } catch {
      const seven = toSevenDays([]);
      setHours(seven);
      savedRef.current = JSON.stringify(seven);
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setDay = useCallback((day: number, patch: Partial<PlaceHour>) => {
    setHours((prev) => {
      const next = prev.map((h) =>
        h.dayOfWeek === day ? { ...h, ...patch } : h,
      );
      setIsDirty(JSON.stringify(next) !== savedRef.current);
      return next;
    });
  }, []);

  const copyToAll = useCallback((fromDay: number) => {
    setHours((prev) => {
      const src = prev.find((h) => h.dayOfWeek === fromDay);
      if (!src) return prev;
      const next = prev.map((h) => ({
        ...h,
        openTime: src.openTime,
        closeTime: src.closeTime,
        isClosed: src.isClosed,
      }));
      setIsDirty(JSON.stringify(next) !== savedRef.current);
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      // A closed day carries no times; an open day must carry both.
      const payload = hours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        isClosed: h.isClosed,
        openTime: h.isClosed ? null : h.openTime || null,
        closeTime: h.isClosed ? null : h.closeTime || null,
      }));
      await adminApi.put(`/v1/admin/places/${placeId}/hours`, {
        hours: payload,
      });
      savedRef.current = JSON.stringify(hours);
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [placeId, hours]);

  return { hours, loading, isDirty, isSaving, setDay, copyToAll, save };
}
