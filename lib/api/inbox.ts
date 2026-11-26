import { adminApi, toList } from '@/lib/api/admin-client';

/** Every Inbox queue's waiting count, from GET /v1/admin/inbox (the nav badge sums them). */
export type InboxCounts = Partial<Record<'corrections' | 'reports' | 'no_hours' | 'owner_requests' | 'photos' | 'renewals' | 'lister_documents' | 'trip_reports' | 'complete_to_publish' | 'missing_price', number>>;
import type { PlaceListMedia } from '@/lib/place-list';
import type { SubmissionMediaRow } from '@/lib/api/submissions';

// Spec 002 contracts/api.md: GET /v1/admin/inbox?type=…, POST /v1/admin/corrections/:id/apply|reject.
export type InboxType = 'corrections' | 'reports' | 'no_hours';

export interface CorrectionRow {
  id: string;
  placeId: string;
  placeName?: string | null;
  placeNameEn?: string | null;
  kind: 'hours' | 'location' | 'phone' | 'closed' | 'photos' | 'prices' | 'name' | 'other';
  /** The place's value now, when the backend sends it. */
  current?: unknown;
  answer: unknown;
  source: 'visit' | 'staff' | 'online';
  photoUrl?: string | null;
  /** Screenshots and short videos the sender attached (team-only, expiring links). */
  media?: SubmissionMediaRow[];
  createdAt: string;
  /** Open corrections on the same place (rows arrive grouped, busiest place first). */
  placeOpen?: number;
  /** The sender's record: corrections sent, applied and rejected. */
  reporter?: { total: number; applied: number; rejected: number };
}

export interface AppReportRow {
  id: string;
  kind: 'bug' | 'wrong' | 'slow' | 'account' | 'idea' | 'other';
  text: string;
  photoUrl?: string | null;
  media?: SubmissionMediaRow[];
  /** What the app sent about itself: app version, platform, OS version, model. */
  device?: Record<string, unknown> | null;
  createdAt: string;
}

export interface NoHoursRow extends PlaceListMedia {
  id: string;
  name: string;
  nameEn?: string | null;
}

export interface InboxPage<T> { rows: T[]; total: number }

/** `pages` pages of 100, in order; total is the server's count for the list, not the rows loaded. */
export async function loadInbox<T>(type: InboxType, pages = 1): Promise<InboxPage<T>> {
  const rows: T[] = [];
  let total = 0;
  for (let page = 1; page <= pages; page++) {
    const raw = await adminApi.get<{ rows?: T[]; counts?: Record<InboxType, number> }>('/v1/admin/inbox', { type, page, limit: 100 });
    rows.push(...(raw.rows ?? toList<T>(raw).items));
    total = raw.counts?.[type] ?? rows.length;
    if (rows.length >= total) break;
  }
  return { rows, total };
}

export const applyCorrection = (id: string) => adminApi.post<{ written?: boolean }>(`/v1/admin/corrections/${id}/apply`);
export const closeReport = (id: string, reply: string) => adminApi.post(`/v1/admin/reports/${id}/close`, { reply });
export const rejectCorrection = (id: string, reply: string) => adminApi.post(`/v1/admin/corrections/${id}/reject`, { reply });

// Owner change requests from the owner portal (verification module, live today).
export interface OwnerRequestRow {
  id: string;
  placeId: string;
  kind: 'category' | 'location' | 'city' | 'other';
  message: string;
  createdAt: string;
}

export const replyOwnerRequest = (id: string, state: 'done' | 'declined', reply: string) => adminApi.put(`/v1/admin/verification/requests/${id}`, { state, reply });
