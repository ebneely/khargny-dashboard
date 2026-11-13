import { adminApi, toList } from '@/lib/api/admin-client';
import type { PlaceListMedia } from '@/lib/place-list';

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
  createdAt: string;
}

export interface AppReportRow {
  id: string;
  kind: 'bug' | 'wrong' | 'slow' | 'account' | 'idea' | 'other';
  text: string;
  photoUrl?: string | null;
  createdAt: string;
}

export interface NoHoursRow extends PlaceListMedia {
  id: string;
  name: string;
  nameEn?: string | null;
}

export async function loadInbox<T>(type: InboxType) {
  const raw = await adminApi.get<unknown>('/v1/admin/inbox', { type, limit: 100 });
  return toList<T>(raw).items;
}

export const applyCorrection = (id: string) => adminApi.post(`/v1/admin/corrections/${id}/apply`);
export const rejectCorrection = (id: string, reply: string) => adminApi.post(`/v1/admin/corrections/${id}/reject`, { reply });

// Owner change requests from the owner portal (verification module, live today).
export interface OwnerRequestRow {
  id: string;
  placeId: string;
  kind: 'category' | 'location' | 'city' | 'other';
  message: string;
  createdAt: string;
}

export const loadOwnerRequests = async () => toList<OwnerRequestRow>(await adminApi.get('/v1/admin/verification/requests', { state: 'open', limit: 100 })).items;
export const replyOwnerRequest = (id: string, state: 'done' | 'declined', reply: string) => adminApi.put(`/v1/admin/verification/requests/${id}`, { state, reply });
