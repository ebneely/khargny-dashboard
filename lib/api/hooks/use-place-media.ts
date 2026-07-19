'use client';

import { useState, useCallback, useEffect } from 'react';
import { adminApi, AdminApiError } from '../admin-client';

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
  urls?: { thumb?: string; small?: string; medium?: string; large?: string; original?: string };
}

export interface PlaceVideo {
  id: string;
  url: string;
  posterUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  mimeType?: string | null;
}

export interface UploadItem {
  id: string;
  name: string;
  kind: 'image' | 'video';
  percent: number;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
}

// Max simultaneous uploads — the rest wait in the queue.
const MAX_CONCURRENT = 2;

export interface UsePlaceMediaResult {
  images: PlaceImage[];
  videos: PlaceVideo[];
  loading: boolean;
  isError: boolean;
  busy: boolean;
  /** Live per-file upload progress (animated bars in the UI). */
  queue: UploadItem[];
  refetch: () => Promise<void>;
  upload: (file: File) => Promise<void>;
  /** Upload several files in one go (multi-select / drag-drop onto the dropzone). */
  uploadMany: (files: File[]) => Promise<void>;
  remove: (imageId: string) => Promise<void>;
  move: (imageId: string, dir: -1 | 1) => Promise<void>;
  /** Reorder by index (drag-drop) and persist the new order. */
  reorder: (fromIdx: number, toIdx: number) => Promise<void>;
  /** Upload video files (POST /v1/admin/media/video). */
  uploadVideos: (files: File[]) => Promise<void>;
  removeVideo: (videoId: string) => Promise<void>;
}

let uploadSeq = 0;

export function usePlaceMedia(placeId: string): UsePlaceMediaResult {
  const [images, setImages] = useState<PlaceImage[]>([]);
  const [videos, setVideos] = useState<PlaceVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);

  const patchItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setQueue((q) => q.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const refetch = useCallback(async () => {
    if (!placeId) return;
    setLoading(true);
    setIsError(false);
    try {
      const result = await adminApi.get<{
        images?: PlaceImage[];
        videos?: PlaceVideo[];
      }>(`/v1/admin/media/place/${placeId}`);
      const list = (result.images ?? []).slice().sort((a, b) => a.order - b.order);
      setImages(list);
      setVideos(result.videos ?? []);
    } catch {
      setIsError(true);
    } finally {
      setLoading(false);
    }
  }, [placeId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Upload a batch (image or video) with per-file animated progress and a
  // concurrency cap of MAX_CONCURRENT (2 at a time; the rest wait). Each file
  // shows 0→100 %. Refetches once the whole batch settles. Completed rows clear
  // from the queue shortly after so the UI doesn't accumulate.
  const runBatch = useCallback(
    async (files: File[], kind: 'image' | 'video', startOrder: number) => {
      if (!files.length) return;
      const items: (UploadItem & { file: File; order: number })[] = files.map(
        (file, i) => ({
          id: `up-${++uploadSeq}`,
          name: file.name,
          kind,
          percent: 0,
          status: 'queued',
          file,
          order: startOrder + i,
        }),
      );
      setQueue((q) => [...q, ...items.map(({ file: _f, order: _o, ...rest }) => rest)]);
      setBusy(true);

      let cursor = 0;
      const worker = async () => {
        while (cursor < items.length) {
          const item = items[cursor++];
          patchItem(item.id, { status: 'uploading' });
          try {
            const form = new FormData();
            form.append('file', item.file);
            form.append('placeId', placeId);
            form.append('type', kind);
            if (kind === 'image') form.append('order', String(item.order));
            await adminApi.uploadWithProgress(
              `/v1/admin/media/${kind}`,
              form,
              (percent) => patchItem(item.id, { percent }),
            );
            patchItem(item.id, { status: 'done', percent: 100 });
          } catch (err) {
            patchItem(item.id, {
              status: 'error',
              error: err instanceof AdminApiError ? err.message : 'Upload failed',
            });
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(MAX_CONCURRENT, items.length) }, worker),
      );
      await refetch();
      setBusy(false);
      // Drop finished rows after a beat; keep errored ones so they can retry/see.
      const doneIds = items.map((i) => i.id);
      setTimeout(() => {
        setQueue((q) => q.filter((it) => !(doneIds.includes(it.id) && it.status === 'done')));
      }, 1500);
    },
    [placeId, patchItem, refetch],
  );

  const upload = useCallback(
    (file: File) => runBatch([file], 'image', images.length),
    [runBatch, images.length],
  );

  const uploadMany = useCallback(
    (files: File[]) => runBatch(files, 'image', images.length),
    [runBatch, images.length],
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

  const uploadVideos = useCallback(
    (files: File[]) => runBatch(files, 'video', 0),
    [runBatch],
  );

  const removeVideo = useCallback(
    async (videoId: string) => {
      setBusy(true);
      try {
        await adminApi.delete(`/v1/admin/media/${videoId}/video`);
        await refetch();
      } finally {
        setBusy(false);
      }
    },
    [refetch],
  );

  return {
    images,
    videos,
    loading,
    isError,
    busy,
    queue,
    refetch,
    upload,
    uploadMany,
    remove,
    move,
    reorder,
    uploadVideos,
    removeVideo,
  };
}
