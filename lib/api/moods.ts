'use client';

import { adminApi } from './admin-client';

/** Weight of one tag/amenity/category inside a mood: 0 (off) to 3 (the mood's core). */
export interface MoodWeights {
  tags: Record<string, number>;
  amenities: Record<string, number>;
  categories: Record<string, number>;
}

export interface Mood {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  icon: string;
  accent: string;
  sort: number;
  enabled: boolean;
  weights: MoodWeights;
  weightCount: number;
  updatedAt: string;
}

export interface MoodInput {
  slug?: string;
  nameEn?: string;
  nameAr?: string;
  icon?: string;
  accent?: string;
  sort?: number;
  enabled?: boolean;
  weights?: MoodWeights;
}

export interface MoodPreviewPlace {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  region: string | null;
  category: { ar: string | null; en: string | null };
  fit: number;
}

export const moodsApi = {
  list: () => adminApi.get<{ data: Mood[] }>('/v1/admin/moods'),
  create: (body: MoodInput) => adminApi.post<Mood>('/v1/admin/moods', body),
  update: (id: string, body: MoodInput) => adminApi.patch<Mood>(`/v1/admin/moods/${id}`, body),
  remove: (id: string) => adminApi.delete<{ deleted: true }>(`/v1/admin/moods/${id}`),
  reorder: (ids: string[]) => adminApi.post<{ data: Mood[] }>('/v1/admin/moods/reorder', { ids }),
  preview: (id: string, cityId?: string) => adminApi.get<MoodPreviewPlace[]>(`/v1/admin/moods/${id}/preview`, { cityId }),
  /** Unsaved weights: the live preview while editing. */
  draftPreview: (id: string, weights: MoodWeights, cityId?: string) => adminApi.post<MoodPreviewPlace[]>(`/v1/admin/moods/${id}/preview`, { weights, cityId }),
};
