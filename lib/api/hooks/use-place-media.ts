'use client';

import { useState, useCallback, useEffect } from 'react';
import { adminApi } from '../admin-client';

// US-admin-MED-001 — a place's image gallery.
// GET    /v1/admin/media/place/:placeId       -> { images, videos }
// POST   /v1/admin/media/image  (multipart)   -> new image
// DELETE /v1/admin/media/:id/image
// POST   /v1/admin/media/reorder { type, items:[{id,order}] }
export interface PlaceImage {
  id: string;
  url: string;
  order: number;
  altText: string | null;
  urls?: { thumb?: string; small?: string; medium?: string; original?: string };
}

export interface UsePlaceMediaResult {
  images: PlaceImage[];
  loading: boolean;
  isError: boolean;
  busy: boolean;
  refetch: () => Promise<void>;
  upload: (file: File) => Promise<void>;
  /** Upload several files in one go (multi-select / drag-drop onto the dropzone). */
  uploadMany: (files: File[]) => Promise<void>;
  remove: (imageId: string) => Promise<void>;
  move: (imageId: string, dir: -1 | 1) => Promise<void>;
  /** Reorder by index (drag-drop) and persist the new order. */
  reorder: (fromIdx: number, toIdx: number) => Promise<void>;
}

export function usePlaceMedia(placeId: string): UsePlaceMediaResult {
  const [images, setImages] = useState<PlaceImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    if (!placeId) return;
    setLoading(true);
    setIsError(false);
    try {
      const result = await adminApi.get<{ images?: PlaceImage[] }>(
        `/v1/admin/media/place/${placeId}`,
      );
      const list = (result.images ?? []).slice().sort((a, b) => a.order - b.order);
      setImages(list);
    } catch {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('placeId', placeId);
        form.append('type', 'image');
        form.append('order', String(images.length));
        await adminApi.upload(`/v1/admin/media/image`, form);
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [placeId, images.length, refetch],
  );

  // Upload many files sequentially (keeps a deterministic order), then refetch once.
  const uploadMany = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setBusy(true);
      try {
        let order = images.length;
        for (const file of files) {
          const form = new FormData();
          form.append('file', file);
          form.append('placeId', placeId);
          form.append('type', 'image');
          form.append('order', String(order++));
          await adminApi.upload(`/v1/admin/media/image`, form);
        }
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [placeId, images.length, refetch],
  );

  const remove = useCallback(
    async (imageId: string) => {
      setBusy(true);
      try {
        await adminApi.delete(`/v1/admin/media/${imageId}/image`);
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [refetch],
  );

  // Swap an image with its neighbour and persist the new order.
  const move = useCallback(
    async (imageId: string, dir: -1 | 1) => {
      const idx = images.findIndex((i) => i.id === imageId);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= images.length) return;
      const reordered = images.slice();
      [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
      setBusy(true);
      try {
        await adminApi.post(`/v1/admin/media/reorder`, {
          type: 'image',
          items: reordered.map((img, order) => ({ id: img.id, order })),
        });
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [images, refetch],
  );

  // Move an image from one index to another (drag-drop) and persist the order.
  const reorder = useCallback(
    async (fromIdx: number, toIdx: number) => {
      if (
        fromIdx === toIdx ||
        fromIdx < 0 ||
        toIdx < 0 ||
        fromIdx >= images.length ||
        toIdx >= images.length
      ) {
        return;
      }
      const reordered = images.slice();
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      setImages(reordered); // optimistic
      setBusy(true);
      try {
        await adminApi.post(`/v1/admin/media/reorder`, {
          type: 'image',
          items: reordered.map((img, order) => ({ id: img.id, order })),
        });
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [images, refetch],
  );

  return { images, loading, isError, busy, refetch, upload, uploadMany, remove, move, reorder };
}
