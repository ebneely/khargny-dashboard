'use client';

import * as React from 'react';
import { canDeactivatePlace, placePublicState } from '@/lib/place-public-state';
import type { AdminPlace } from '@/lib/api/types';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { useDashboardCopy } from './dashboard-text';
import { SegmentedControl } from './segmented-control';
import { PageActions } from './page-actions';
import { ActionDialog, type ActionSpec } from './subscriber-ui';

export function PlaceStatusControl({ place, value, onChange, disabled }: { place: AdminPlace; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const copy = useDashboardCopy();
  const readOnly = useDashboardReadOnly();
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const inactiveSupported = canDeactivatePlace(place);
  const state = placePublicState(place);
  const change = (next: string) => {
    if (readOnly || disabled) return;
    if (next === 'inactive') setAction({ title: copy('Deactivate this place?'), description: copy('The place will be hidden from visitors. Its media, owner and subscriptions are kept.'), destructive: true, submit: async () => { onChange(next); } });
    else onChange(next);
  };
  return <div className="min-w-0 space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl label="Place status" value={value} onValueChange={change} options={(inactiveSupported ? [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Deactivated' }, ...(value === 'draft' ? [{ value: 'draft', label: 'Draft' }] : [])] : [{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }]).map((option) => ({ ...option, disabled: Boolean(readOnly || disabled) }))} />
      {value === 'draft' && <PageActions form actions={[{ label: 'Publish', onClick: () => change('active'), allowed: !readOnly, disabled }]} />}
    </div>
    <p className="max-w-prose text-sm text-muted-foreground" role="status">{copy(value === place.status ? state.sentence : 'Save changes to apply this status.')}</p>
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}
