import { adminApi } from './api/admin-client';

export type PlaceStatusAction = 'activate' | 'deactivate';
export type PlaceStatusResult = { id: string; ok: boolean; state?: string; code?: string; message?: string };
export function remainingPlaceSelection(selected: string[], results: PlaceStatusResult[]) {
  const succeeded = new Set(results.filter(row => row.ok).map(row => row.id));
  return selected.filter(id => !succeeded.has(id));
}
export function bulkPlaceStatus(placeIds: string[], action: PlaceStatusAction, reason?: string) {
  if (!placeIds.length || placeIds.length > 100 || new Set(placeIds).size !== placeIds.length) throw new Error('Invalid bulk selection');
  return adminApi.post<{ action: PlaceStatusAction; results: PlaceStatusResult[]; meta: { succeeded: number; failed: number } }>('/v1/admin/places/bulk-status', { placeIds, action, ...(action === 'deactivate' ? { reason: reason?.trim() } : {}) });
}
