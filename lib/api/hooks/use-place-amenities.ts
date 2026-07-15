'use client';

import { useState, useCallback, useRef } from 'react';
import { adminApi } from '../admin-client';
import type { PlaceAmenityAssignment } from '../types';

export interface UsePlaceAmenitiesResult {
  amenityIds: string[];
  setAmenityIds: (ids: string[]) => void;
  toggleAmenity: (id: string) => void;
  isDirty: boolean;
  isSaving: boolean;
  markSaved: (ids: string[]) => void;
  save: () => Promise<void>;
}

export function usePlaceAmenities(
  placeId: string,
  initialAmenityIds: string[] = [],
): UsePlaceAmenitiesResult {
  const [amenityIds, setAmenityIdsState] = useState<string[]>(initialAmenityIds);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialRef = useRef<string[]>(initialAmenityIds);

  const setAmenityIds = useCallback((ids: string[]) => {
    setAmenityIdsState(ids);
    setIsDirty(
      ids.length !== initialRef.current.length ||
        ids.some((id) => !initialRef.current.includes(id)),
    );
  }, []);

  const toggleAmenity = useCallback((id: string) => {
    setAmenityIdsState((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      setIsDirty(
        next.length !== initialRef.current.length ||
          next.some((x) => !initialRef.current.includes(x)),
      );
      return next;
    });
  }, []);

  const markSaved = useCallback((ids: string[]) => {
    initialRef.current = ids;
    setAmenityIdsState(ids);
    setIsDirty(false);
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await adminApi.post<PlaceAmenityAssignment>(
        `/v1/admin/amenities/place/${placeId}/assign`,
        { amenityIds },
      );
      markSaved(response.amenityIds);
    } finally {
      setIsSaving(false);
    }
  }, [placeId, amenityIds, markSaved]);

  return {
    amenityIds,
    setAmenityIds,
    toggleAmenity,
    isDirty,
    isSaving,
    markSaved,
    save,
  };
}
