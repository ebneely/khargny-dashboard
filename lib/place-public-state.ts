import type { AdminPlace } from '@/lib/api/types';

export type PlacePublicState = string | { state: string; reason?: string | null };
export type PlacePromotion = { id: string; source: 'plan' | 'manual'; surface: string; state: string; startDate?: string; endDate?: string | null; impressions?: number; taps?: number; metricsFrom?: string; metricsTo?: string };

type VisibilityPlace = Pick<AdminPlace, 'status' | 'hasMedia' | '_count' | 'publicState' | 'capabilities'>;
export function canDeactivatePlace(place: Pick<AdminPlace, 'status' | 'capabilities'>) {
  return place.status === 'inactive' || place.capabilities?.inactiveStatus !== false;
}

export function placePublicState(place: VisibilityPlace) {
  const publicState = typeof place.publicState === 'string' ? place.publicState : place.publicState?.state;
  const reason = typeof place.publicState === 'object' ? place.publicState.reason : undefined;
  const states: Record<string, { label: string; sentence: string; tone: string }> = {
    live: { label: 'Live', sentence: 'Live on the website', tone: 'live' },
    no_media: { label: 'Active, not shown: no approved media', sentence: 'Active, but not shown: add approved photos or video', tone: 'paused' },
    draft: { label: 'Draft', sentence: 'Not shown: draft', tone: 'draft' },
    inactive: { label: 'Deactivated', sentence: 'Not shown: deactivated', tone: 'inactive' },
    deleted: { label: 'Not shown: deleted', sentence: 'Not shown: deleted', tone: 'inactive' },
    merged: { label: 'Not shown: merged into another place', sentence: 'Not shown: merged into another place', tone: 'inactive' },
  };
  const explicit = publicState === 'not_shown' ? ({ no_media: 'no_media', no_photos: 'no_media', draft: 'draft', inactive: 'inactive', deactivated: 'inactive' } as Record<string, string>)[reason ?? ''] : publicState;
  if (reason === 'deleted' || reason === 'merged') return states[reason];
  if (explicit && states[explicit]) return states[explicit];
  return { label: 'Visibility unavailable', sentence: 'Visibility was not returned by the backend.', tone: 'paused' };
}

export function placeStatusFilters(statusFilter: string, mediaFilter = 'all') {
  return {
    status: statusFilter === 'all' ? undefined : ['live', 'not-shown'].includes(statusFilter) ? 'active' : statusFilter,
    publicState: statusFilter === 'live' ? 'live' as const : statusFilter === 'not-shown' ? 'not_shown' as const : undefined,
    hasMedia: mediaFilter === 'all' ? undefined : mediaFilter === 'with',
  };
}
