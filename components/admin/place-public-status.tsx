'use client';

import { placePublicState } from '@/lib/place-public-state';
import type { AdminPlace } from '@/lib/api/types';
import { StatusBadge } from './subscriber-ui';
import { useDashboardCopy } from './dashboard-text';

export function PlacePublicStatus({ place }: { place: Pick<AdminPlace, 'publicState'> & Partial<Pick<AdminPlace, 'deletedAt'>> }) {
  const copy = useDashboardCopy();
  const state = placePublicState(place);
  const label = copy(state.label);
  return <div data-slot="place-public-status" className="min-w-0 space-y-1" role="status"><StatusBadge status={state.tone} title={label}><span data-slot="place-state-label">{state.label === 'Visibility unavailable' ? '—' : label}</span></StatusBadge>{state.reason && <p data-slot="place-state-reason" className="line-clamp-2 break-words text-xs leading-4 text-muted-foreground" title={copy(state.reason)}>{copy(state.reason)}</p>}</div>;
}
