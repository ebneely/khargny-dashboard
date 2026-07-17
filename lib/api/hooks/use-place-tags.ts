'use client';

import { useState, useCallback, useRef } from 'react';
import { adminApi } from '../admin-client';

// US-admin-TAG-001 — assign tags to a place. Mirrors usePlaceAmenities.
// POST /v1/admin/tags/place/:placeId/assign { tagIds } replaces the tag set;
// the endpoint returns the raw join rows, so we mark saved from the sent ids.
export interface UsePlaceTagsResult {
  tagIds: string[];
  setTagIds: (ids: string[]) => void;
  toggleTag: (id: string) => void;
  isDirty: boolean;
  isSaving: boolean;
  markSaved: (ids: string[]) => void;
  save: () => Promise<void>;
}

export function usePlaceTags(
  placeId: string,
  initialTagIds: string[] = [],
): UsePlaceTagsResult {
  const [tagIds, setTagIdsState] = useState<string[]>(initialTagIds);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialRef = useRef<string[]>(initialTagIds);

  const recomputeDirty = (ids: string[]) =>
    setIsDirty(
      ids.length !== initialRef.current.length ||
        ids.some((id) => !initialRef.current.includes(id)),
    );

  const setTagIds = useCallback((ids: string[]) => {
    setTagIdsState(ids);
    recomputeDirty(ids);
  }, []);

  const toggleTag = useCallback((id: string) => {
    setTagIdsState((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      recomputeDirty(next);
      return next;
    });
  }, []);

  const markSaved = useCallback((ids: string[]) => {
    initialRef.current = ids;
    setTagIdsState(ids);
    setIsDirty(false);
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      await adminApi.post(`/v1/admin/tags/place/${placeId}/assign`, { tagIds });
      markSaved(tagIds);
    } finally {
      setIsSaving(false);
    }
  }, [placeId, tagIds, markSaved]);

  return {
    tagIds,
    setTagIds,
    toggleTag,
    isDirty,
    isSaving,
    markSaved,
    save,
  };
}
