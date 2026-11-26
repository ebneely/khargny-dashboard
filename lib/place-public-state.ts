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
    // §13: an active place that is not 100% complete. The old name (no_media) still
    // arrives from cached payloads, so both read the same way.
    incomplete: { label: 'Hidden — incomplete', sentence: 'Hidden: not 100% complete yet', tone: 'paused', reason: 'Missing required details' },
    no_media: { label: 'Hidden — incomplete', sentence: 'Hidden: not 100% complete yet', tone: 'paused', reason: 'Missing required details' },
    draft: { label: 'Draft', sentence: 'Not shown: draft', tone: 'draft', reason: null },
    inactive: { label: 'Deactivated', sentence: 'Not shown: deactivated', tone: 'inactive', reason: null },
    deleted: { label: 'Deleted', sentence: 'Not shown: deleted', tone: 'deleted', reason: null },
    merged: { label: 'Not shown', sentence: 'Not shown: merged into another place', tone: 'inactive', reason: 'Merged into another place' },
  };
  if (place.deletedAt) return states.deleted;
  const explicit = publicState === 'not_shown' ? ({ no_media: 'incomplete', no_photos: 'incomplete', incomplete: 'incomplete', draft: 'draft', inactive: 'inactive', deactivated: 'inactive' } as Record<string, string>)[reason ?? ''] : publicState;
  if (reason === 'deleted' || reason === 'merged') return states[reason];
  if (explicit && states[explicit]) return { ...states[explicit], reason: reason && !['no_media', 'no_photos', 'incomplete', 'inactive', 'deactivated', 'draft'].includes(reason) ? reason : states[explicit].reason };
  return { label: 'Visibility unavailable', sentence: 'Visibility was not returned by the backend.', tone: 'paused', reason: 'Visibility was not returned by the backend.' };
}

export function placeStatusFilters(statusFilter: string, mediaFilter = 'all') {
  return {
    status: statusFilter === 'all' ? undefined : ['live', 'not-shown'].includes(statusFilter) ? 'active' : statusFilter,
    publicState: statusFilter === 'live' ? 'live' as const : statusFilter === 'not-shown' ? 'incomplete' as const : undefined,
    hasMedia: mediaFilter === 'all' ? undefined : mediaFilter === 'with',
  };
}
