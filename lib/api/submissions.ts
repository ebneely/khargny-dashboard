import { adminApi } from '@/lib/api/admin-client';

// Spec 002 contracts/api.md: GET /v1/admin/submissions (corrections, reports, owner requests, photos).
export type SubmissionType = 'correction' | 'report' | 'owner_request' | 'photo';

/** A screenshot, photo or short video a customer attached; links are team-only and expire. */
export interface SubmissionMediaRow {
  type: 'image' | 'video';
  url: string | null;
  thumbUrl: string | null;
  width: number | null;
  height: number | null;
  size: number;
  durationSeconds: number | null;
}

export interface SubmissionRow {
  id: string;
  type: SubmissionType;
  kind: string;
  status: string;
  waiting: boolean;
  placeId: string | null;
  placeName: string | null;
  placeNameEn: string | null;
  cityId: string | null;
  createdAt: string;
  decidedAt: string | null;
  reply: string | null;
  photoUrl: string | null;
  media: SubmissionMediaRow[];
  detail: {
    answer?: unknown; source?: string; current?: unknown;
    text?: string; device?: Record<string, unknown> | null;
    message?: string;
    width?: number; height?: number; size?: number; imageId?: string | null;
  };
}

export interface SubmissionFilters {
  type?: SubmissionType; status?: 'open' | 'closed'; sort?: 'newest' | 'oldest';
  placeId?: string; cityId?: string; from?: string; to?: string;
}

export interface SubmissionPage { rows: SubmissionRow[]; total: number }

/** `pages` pages of 50, in order; total is the server's count. */
export async function loadSubmissions(filters: SubmissionFilters, pages = 1, limit = 50): Promise<SubmissionPage> {
  const rows: SubmissionRow[] = [];
  let total = 0;
  for (let page = 1; page <= pages; page++) {
    const raw = await adminApi.get<{ rows: SubmissionRow[]; total: number }>('/v1/admin/submissions', { ...filters, page, limit });
    rows.push(...raw.rows);
    total = raw.total;
    if (rows.length >= total || !raw.rows.length) break;
  }
  return { rows, total };
}

export const reviewPhoto = (id: string, verb: 'approve' | 'reject', reason?: string) =>
  adminApi.post(`/v1/admin/photo-submissions/${id}/${verb}`, verb === 'reject' ? { reason } : undefined);
