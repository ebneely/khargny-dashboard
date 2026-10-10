'use client';

import * as React from 'react';
import { canDeactivatePlace, placePublicState } from '@/lib/place-public-state';
import type { AdminPlace } from '@/lib/api/types';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { useDashboardCopy } from './dashboard-text';
import { SegmentedControl } from './segmented-control';
import { PageActions } from './page-actions';
import { ActionDialog, type ActionSpec } from './subscriber-ui';
import { adminApi } from '@/lib/api/admin-client';

export function PlaceStatusControl({ place, value, onChange, onApplied, disabled }: { place: AdminPlace; value: string; onChange: (value: string) => void; onApplied?: (place: AdminPlace) => void; disabled?: boolean }) {
  const copy = useDashboardCopy();
  const readOnly = useDashboardReadOnly();
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [applied, setApplied] = React.useState<AdminPlace | null>(null);
  const inactiveSupported = canDeactivatePlace(place);
  const effectivePlace = applied ?? place;
  const state = placePublicState(effectivePlace);
  const change = (next: string) => {
    if (readOnly || disabled) return;
    if (next === 'inactive' || next === 'active') setAction({ title: copy(next === 'inactive' ? 'Deactivate this place?' : 'Activate this place?'), description: copy('The status is applied immediately. Media, owner, campaigns and subscriptions are kept. Visitor visibility still follows the backend public state.'), destructive: next === 'inactive', fields: next === 'inactive' ? [{ name: 'reason', label: copy('Deactivation reason (optional)'), type: 'textarea' }] : [], submit: async values => {
      if (readOnly || disabled) return;
      const reason = String(values.reason ?? '').trim();
      if (reason.length > 1000) throw new Error(copy('Reason must be at most 1000 characters.'));
      const updated = await adminApi.post<AdminPlace>(`/v1/admin/places/${place.id}/${next === 'inactive' ? 'deactivate' : 'activate'}`, next === 'inactive' && reason ? { reason } : {});
      setApplied(updated); onChange(updated.status); onApplied?.(updated);
    } });
    else onChange(next);
  };
  return <div className="min-w-0 space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl label="Place status" value={value} onValueChange={change} options={(inactiveSupported ? [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Deactivated' }, { value: 'draft', label: 'Draft' }] : [{ value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' }]).map((option) => ({ ...option, disabled: Boolean(readOnly || disabled) }))} />
      {value === 'draft' && <PageActions form actions={[{ label: 'Publish', onClick: () => change('active'), allowed: !readOnly, disabled }]} />}
    </div>
    <p className="max-w-prose text-sm text-muted-foreground" role="status">{copy(value === effectivePlace.status ? state.sentence : 'Save changes to apply this status.')}{typeof effectivePlace.publicState === 'object' && effectivePlace.publicState.reason && <> · <bdi>{effectivePlace.publicState.reason}</bdi></>}</p>
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}
