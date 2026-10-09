import type { AdminPlace } from '@/lib/api/types';

export type PlacePublicState = string | { state: string; reason?: string | null };
export type PlacePromotion = { id: string; source: 'plan' | 'manual'; surface: string; state: string; startDate?: string; endDate?: string | null; impressions?: number; taps?: number; metricsFrom?: string; metricsTo?: string };

type VisibilityPlace = Pick<AdminPlace, 'status' | 'hasMedia' | '_count' | 'publicState' | 'capabilities'>;
export function canDeactivatePlace(place: Pick<AdminPlace, 'status' | 'capabilities'>) {
  return place.status === 'inactive' || place.capabilities?.inactiveStatus === true;
}

export function placePublicState(place: VisibilityPlace) {
  const publicState = typeof place.publicState === 'string' ? place.publicState : place.publicState?.state;
  const reason = typeof place.publicState === 'object' ? place.publicState.reason : undefined;
  const states: Record<string, { label: string; sentence: string; tone: string }> = {
    live: { label: 'Live', sentence: 'Live on the website', tone: 'live' },
    no_media: { label: 'Active, not shown: no photos', sentence: 'Active, but not shown: add a photo', tone: 'paused' },
    draft: { label: 'Draft', sentence: 'Not shown: draft', tone: 'draft' },
    inactive: { label: 'Deactivated', sentence: 'Not shown: deactivated', tone: 'inactive' },
  };
  const explicit = publicState === 'not_shown' ? ({ no_media: 'no_media', no_photos: 'no_media', draft: 'draft', inactive: 'inactive', deactivated: 'inactive' } as Record<string, string>)[reason ?? ''] : publicState;
  if (explicit && states[explicit]) return states[explicit];
  if (place.status === 'inactive') return states.inactive;
  if (place.status === 'draft') return states.draft;
  const hasMedia = place.hasMedia ?? ((place._count?.images ?? 0) + (place._count?.videos ?? 0) > 0);
  return hasMedia ? states.live : states.no_media;
}

export function placeStatusFilters(statusFilter: string, mediaFilter = 'all') {
  return {
    status: statusFilter === 'all' ? undefined : ['live', 'not-shown'].includes(statusFilter) ? 'active' : statusFilter,
    hasMedia: statusFilter === 'live' ? true : statusFilter === 'not-shown' ? false : mediaFilter === 'all' ? undefined : mediaFilter === 'with',
  };
}
