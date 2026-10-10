import type { AdminPlace } from '@/lib/api/types';

export type PlacePublicState = string | { state: string; reason?: string | null };
export type PlacePromotion = { id: string; source: 'plan' | 'manual'; surface: string; state: string; startDate?: string; endDate?: string | null; impressions?: number; taps?: number; metricsFrom?: string; metricsTo?: string };

type VisibilityPlace = Pick<AdminPlace, 'publicState'> & Partial<Pick<AdminPlace, 'status' | 'hasMedia' | '_count' | 'capabilities' | 'deletedAt'>>;
export function canDeactivatePlace(place: Pick<AdminPlace, 'status' | 'capabilities'>) {
  return place.status === 'inactive' || place.capabilities?.inactiveStatus !== false;
}

export function placePublicState(place: VisibilityPlace) {
  const publicState = typeof place.publicState === 'string' ? place.publicState : place.publicState?.state;
  const reason = typeof place.publicState === 'object' ? place.publicState.reason : undefined;
  const states: Record<string, { label: string; sentence: string; tone: string; reason: string | null }> = {
    live: { label: 'Live', sentence: 'Live on the website', tone: 'live', reason: null },
    no_media: { label: 'Not shown', sentence: 'Active, but not shown: add approved photos or video', tone: 'paused', reason: 'No approved media' },
    draft: { label: 'Draft', sentence: 'Not shown: draft', tone: 'draft', reason: null },
    inactive: { label: 'Deactivated', sentence: 'Not shown: deactivated', tone: 'inactive', reason: null },
    deleted: { label: 'Deleted', sentence: 'Not shown: deleted', tone: 'deleted', reason: null },
    merged: { label: 'Not shown', sentence: 'Not shown: merged into another place', tone: 'inactive', reason: 'Merged into another place' },
  };
  if (place.deletedAt) return states.deleted;
  const explicit = publicState === 'not_shown' ? ({ no_media: 'no_media', no_photos: 'no_media', draft: 'draft', inactive: 'inactive', deactivated: 'inactive' } as Record<string, string>)[reason ?? ''] : publicState;
  if (reason === 'deleted' || reason === 'merged') return states[reason];
  if (explicit && states[explicit]) return { ...states[explicit], reason: reason && !['no_media', 'no_photos', 'inactive', 'deactivated', 'draft'].includes(reason) ? reason : states[explicit].reason };
  return { label: 'Visibility unavailable', sentence: 'Visibility was not returned by the backend.', tone: 'paused', reason: 'Visibility was not returned by the backend.' };
}

export function placeStatusFilters(statusFilter: string, mediaFilter = 'all') {
  return {
    status: statusFilter === 'all' ? undefined : ['live', 'not-shown'].includes(statusFilter) ? 'active' : statusFilter,
    publicState: statusFilter === 'live' ? 'live' as const : statusFilter === 'not-shown' ? 'not_shown' as const : undefined,
    hasMedia: mediaFilter === 'all' ? undefined : mediaFilter === 'with',
  };
}
