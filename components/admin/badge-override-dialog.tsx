'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AdminApiError } from '@/lib/api/admin-client';
import { badgesApi, type BadgeKey, type ManagedBadge } from '@/lib/api/badges';
import { cairoDate, type SubscriberPlace } from '@/lib/api/subscribers';
import { shiftCalendarDays } from '@/lib/subscription-calendar';
import { overrideRequest } from '@/lib/badge-rules';
import { useDashboardCopy } from './dashboard-text';
import { DateField } from './date-field';
import { SegmentedControl } from './segmented-control';
import { PlaceSearchPicker } from './place-search-picker';
import { Field, RequestError, SubscriberSelect, textareaClass, useSubscriberText } from './subscriber-ui';

export function BadgeOverrideDialog({ badges, canWrite, initial, refresh, onClose }: { badges: ManagedBadge[]; canWrite: boolean; initial?: { badgeKey: BadgeKey; place: SubscriberPlace }; refresh: () => Promise<void>; onClose: () => void }) {
  const copy = useDashboardCopy();
  const { lang, pick } = useSubscriberText();
  const [badgeKey, setBadgeKey] = React.useState<BadgeKey>(initial?.badgeKey ?? badges[0]?.key ?? 'most_saved');
  const [place, setPlace] = React.useState<SubscriberPlace | null>(initial?.place ?? null);
  const [kind, setKind] = React.useState<'pin' | 'exclude'>('exclude');
  const [date, setDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const writing = React.useRef(false);
  const [error, setError] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  if (!canWrite) return null;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || writing.current) return;
    const invalid: Record<string, string> = {};
    if (!place) invalid.placeId = copy('Choose a place, a reason and a valid future end date.');
    if (!reason.trim() || reason.length > 1000) invalid.reason = copy('Reason is required (at most 1000 characters).');
    let body;
    try {
      body = overrideRequest(place?.id ?? '', kind, reason, date);
      if (kind === 'pin' && !body.until || body.until && (Date.parse(body.until) <= Date.now() || kind === 'pin' && Date.parse(body.until) > Date.now() + 90 * 86400000)) invalid.until = copy('Choose a place, a reason and a valid future end date.');
    } catch { invalid.until = copy('Choose a place, a reason and a valid future end date.'); }
    setErrors(invalid); if (Object.keys(invalid).length || !body) return;
    writing.current = true; setBusy(true); setError('');
    try { await badgesApi.addOverride(badgeKey, body); toast.success(copy('Saved. The holders are being recalculated')); await refresh(); onClose(); }
    catch (caught) { setErrors(caught instanceof AdminApiError ? caught.fields : {}); setError(copy(caught instanceof AdminApiError && caught.status === 409 ? 'This place already has an override for this badge. Remove it first.' : 'Could not save the override. Try again.')); }
    finally { writing.current = false; setBusy(false); }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="sm:max-w-xl" dir={lang === 'ar' ? 'rtl' : 'ltr'} showCloseButton={!busy}><DialogHeader><DialogTitle>{copy('Add override')}</DialogTitle><DialogDescription>{copy('Pins and exclusions are team decisions, not earned activity.')}</DialogDescription></DialogHeader>
    <form onSubmit={save} className="space-y-4"><fieldset disabled={busy} className="max-h-[60vh] min-w-0 space-y-4 overflow-y-auto px-1">
      <Field label={copy('Badge')} error={errors.badgeKey}><SubscriberSelect value={badgeKey} disabled={busy} onValueChange={(value) => setBadgeKey(value as BadgeKey)} options={badges.map((badge) => ({ value: badge.key, label: pick(badge.nameAr, badge.nameEn) }))} /></Field>
      <Field label={copy('Place')} error={errors.placeId}>{initial ? <p className="text-sm">{pick(initial.place.name, initial.place.nameEn)}</p> : <PlaceSearchPicker value={place} onChange={setPlace} disabled={busy} />}</Field>
      <SegmentedControl label={copy('Kind')} value={kind} onValueChange={(value) => setKind(value as 'pin' | 'exclude')} options={[{ value: 'exclude', label: copy('Excluded'), disabled: busy }, { value: 'pin', label: copy('Pinned'), disabled: busy }]} />
      <p className="rounded-lg bg-muted p-3 text-sm">{copy(kind === 'pin' ? 'Pin: this place shows this badge until a date, whatever its numbers' : 'Exclude: this place does not get this badge')}</p>
      <Field label={copy('End date (Cairo)')} error={errors.until} required={kind === 'pin'} optional={kind === 'exclude'}><DateField value={date} onChange={setDate} disabled={busy} required={kind === 'pin'} min={cairoDate()} max={kind === 'pin' ? shiftCalendarDays(cairoDate(), 89) : undefined} /></Field>
      <p className="text-sm text-muted-foreground">{copy('A pin needs an end date within 90 days. It expires at the end of that Cairo day.')}</p>
      <Field label={copy('Reason')} error={errors.reason} required><textarea className={textareaClass} required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></Field><p className="text-sm text-muted-foreground">{copy('Shown to the team in the log')}</p>
    </fieldset>{error && <RequestError message={error} />}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{copy('Back')}</Button><Button type="submit" disabled={busy}>{copy(busy ? 'Saving…' : 'Add override')}</Button></div></form>
  </DialogContent></Dialog>;
}
