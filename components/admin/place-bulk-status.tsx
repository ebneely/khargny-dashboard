'use client';

import * as React from 'react';
import { bulkPlaceStatus, bulkPlaceStatusLabel, remainingPlaceSelection, type PlaceStatusAction, type PlaceStatusResult } from '@/lib/place-bulk-status';
import { FormActionBar } from './form-action-bar';
import { RecordList } from './record-list';
import { RecordCell } from './record-cell';
import { useDashboardCopy } from './dashboard-text';
import { RequestError } from './subscriber-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { placeCover } from '@/lib/place-list';
import type { AdminPlace } from '@/lib/api/types';

export function PlaceBulkStatus({ selected, records, onSelection, refresh, disabled, onBusy }: { selected: string[]; records: AdminPlace[]; onSelection: (ids: string[]) => void; refresh: () => Promise<unknown>; disabled?: boolean; onBusy?: (busy: boolean) => void }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const [intent, setIntent] = React.useState<PlaceStatusAction | null>(null);
  const [busy, setBusy] = React.useState(false);
  const lock = React.useRef(false);
  const [error, setError] = React.useState('');
  const [snapshot, setSnapshot] = React.useState<AdminPlace[]>([]);
  const [outcomes, setOutcomes] = React.useState<PlaceStatusResult[]>([]);
  const [refreshFailed, setRefreshFailed] = React.useState(false);
  const apply = async () => {
    if (!intent || lock.current || disabled || refreshFailed) return;
    lock.current = true; setBusy(true); onBusy?.(true); setError('');
    try {
      const result = await bulkPlaceStatus(selected, intent);
      setSnapshot(records); setOutcomes(result.results); onSelection(remainingPlaceSelection(selected, result.results)); setIntent(null);
      if (await refresh() === false) setRefreshFailed(true);
    } catch { setError(copy('Could not change places. Selection is kept.')); }
    finally { lock.current = false; setBusy(false); onBusy?.(false); }
  };
  return <>{outcomes.length > 0 && <section data-slot="bulk-place-results" className="mt-4 space-y-3"><h2 className="font-semibold">{copy('Place status results')}</h2><p role="status" className="text-sm">{copy('Successful places are unticked. Places that could not change stay selected.')}</p><RecordList scope="bulk-place-results" records={outcomes} searchText={row => `${snapshot.find(place => place.id === row.id)?.name ?? row.id} ${row.message ?? ''}`} filters={[{ key: 'result', label: 'All results', options: [{ value: 'ok', label: 'Changed' }, { value: 'failed', label: 'Could not change' }], value: row => row.ok ? 'ok' : 'failed' }]} render={rows => <ul className="divide-y">{rows.map(row => { const place = snapshot.find(place => place.id === row.id); return <li key={row.id} className="space-y-2 py-3"><RecordCell nameAr={place?.name} nameEn={place?.nameEn} name={!place ? row.id : undefined} thumbnail={placeCover(place ?? {})} /><p role={row.ok ? undefined : 'alert'} className="break-words text-sm">{copy(row.ok ? row.state === 'active' ? 'Active' : 'Deactivated' : 'Could not change')}{!row.ok && <> · {row.message || row.code || copy('No reason supplied by the server.')}</>}</p></li>; })}</ul>} />{refreshFailed && <RequestError message={copy('Saved, but could not refresh. Reload before changing anything else.')} />}</section>}{selected.length > 0 && <FormActionBar dirty={false} saving={busy} error={error} disabled={disabled || refreshFailed} extraActions={<><span role="status" aria-live="polite" className="tabular-nums">{selected.length.toLocaleString(lang)} {copy('places selected')} · {copy('Maximum 100 at once')}</span><Button variant="outline" disabled={busy || disabled || refreshFailed} onClick={() => setIntent('activate')}>{copy('Activate selected places')}</Button><Button variant="outline" disabled={busy || disabled || refreshFailed} onClick={() => setIntent('deactivate')}>{copy('Deactivate selected places')}</Button><Button variant="ghost" disabled={busy} onClick={() => onSelection([])}>{copy('Clear selection')}</Button></>} ><span className="sr-only">{copy('Bulk place status')}</span></FormActionBar>}{intent && <Dialog open onOpenChange={open => { if (!open && !busy) setIntent(null); }}><DialogContent><DialogHeader><DialogTitle>{copy(intent === 'activate' ? 'Activate selected places?' : 'Deactivate selected places?')}</DialogTitle><DialogDescription>{copy(intent === 'deactivate' ? 'Hidden from visitors; promotions pause; the subscription is untouched.' : 'These places become active. Visitor visibility still depends on approved media.')}</DialogDescription></DialogHeader><p role="status">{selected.length.toLocaleString(lang)} {copy('places selected')}</p>{error && <p role="alert" className="text-destructive">{error}</p>}<div className="flex flex-wrap justify-end gap-3"><Button variant="outline" disabled={busy} onClick={() => setIntent(null)}>{copy('Cancel')}</Button><Button disabled={busy} onClick={() => { void apply(); }}>{busy ? copy('Saving…') : bulkPlaceStatusLabel(intent, selected.length, lang)}</Button></div></DialogContent></Dialog>}</>;
}
