'use client';

import * as React from 'react';
import { Check, Eye } from 'lucide-react';
import { DateField } from './date-field';
import { RecordList, type ListAddress } from './record-list';
import { RecordCell } from './record-cell';
import { RowActions } from './row-actions';
import { useDashboardCopy } from './dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { Field, SubscriberSelect } from './subscriber-ui';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import type { AdSurface, SurfaceKind, AdMeasures } from '@/lib/api/ads-round-b';
import { surfaceLabels, groupSurfaces, nobodyPromoted, validAdsRange } from '@/lib/ads-round7b';
import { loadInsightOptions } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';

export function AdsRange({ from, to, onFrom, onTo, maximum = 92 }: { from: string; to: string; onFrom: (date: string) => void; onTo: (date: string) => void; maximum?: number }) {
  const copy = useDashboardCopy();
  return <div className="space-y-2"><div className="grid gap-3 sm:grid-cols-2"><Field label={copy('From')}><DateField readOnlyControl value={from} max={to} onChange={onFrom} /></Field><Field label={copy('To')}><DateField readOnlyControl value={to} min={from} onChange={onTo} /></Field></div>{!validAdsRange(from, to, maximum) && <p role="alert" className="text-sm text-destructive">{copy(maximum === 92 ? 'Choose an ordered range of at most 92 days.' : 'Choose an ordered range of at most 366 days.')}</p>}</div>;
}
export function SurfaceList({ surfaces, scope, onChoose, cities = [], selected, picker = false, address, total, busy }: { address?: ListAddress; total?: number; busy?: boolean; surfaces: AdSurface[]; scope: string; onChoose: (surface: AdSurface) => void; cities?: { id: string; name: string; nameEn: string | null }[]; selected?: string; picker?: boolean }) {
  const copy = useDashboardCopy(); const { pick, lang } = useDashboardLang();
  const grouped = groupSurfaces(surfaces).flatMap(group => group.surfaces);
  const cityName = (id: string | null) => { const city = cities.find(row => row.id === id); return city ? pick(city.name, city.nameEn) : id ?? copy('All Egypt'); };
  return <RecordList scope={scope} records={grouped} address={address} total={total} busy={busy} searchText={row => `${row.name} ${row.key} ${row.scope.areaKey ?? ''} ${cityName(row.scope.cityId)}`} filters={[
    { key: 'kind', label: 'All surfaces', options: Object.entries(surfaceLabels).map(([value, label]) => ({ value, label })), value: row => row.surface },
    { key: 'city', label: 'All cities', options: [...(total === undefined ? [{ value: 'national', label: 'All Egypt' }] : []), ...cities.map(city => ({ value: city.id, label: pick(city.name, city.nameEn) }))], value: row => row.scope.cityId ?? 'national' },
    { key: 'state', label: 'Promotion occupancy', options: [{ value: 'has_free', label: 'Has free space' }, { value: 'full', label: 'Full' }, { value: 'nobody_promoted', label: 'Nobody promoted' }, { value: 'has_paid', label: 'Paid reservations' }], value: () => '', matches: (row, state) => state === 'has_free' ? (row.totals ? row.totals.freeDays > 0 : (row.days ?? []).some(day => day.free > 0)) : state === 'full' ? (row.totals ? row.totals.freeDays === 0 : !(row.days ?? []).some(day => day.free > 0)) : state === 'has_paid' ? row.occupants.some(occupant => occupant.source === 'campaign') : nobodyPromoted(row) },
  ]} empty="No surfaces match these filters." render={visible => <Table layout="list"><TableHeader><TableRow><TableHead>{copy('Surface and scope')}</TableHead><TableHead>{copy('Capacity')}</TableHead>{!picker && <TableHead>{copy('Last 7 days')}</TableHead>}<TableHead column="actions">{copy('Actions')}</TableHead></TableRow></TableHeader><TableBody>{visible.map(row => <TableRow key={row.key} aria-selected={selected === row.key}><TableCell><RecordCell icon={row.surface === 'area' || row.surface === 'city' ? 'location' : row.surface === 'category' ? 'category' : 'section'} name={row.name} chips={selected === row.key ? <Badge>{copy('Selected')}</Badge> : !row.enabled ? <Badge variant="secondary">{copy('Disabled')}</Badge> : undefined} context={`${copy(surfaceLabels[row.surface])} · ${cityName(row.scope.cityId)} · ${row.scope.areaKey ?? ''}`} /></TableCell><TableCell className="whitespace-normal tabular-nums">{row.capacity.toLocaleString(lang)} {copy('paid positions')} · {row.maxSlots.toLocaleString(lang)} {copy('cards')}<p className="text-xs text-muted-foreground">{copy(row.sellable ? 'Paid' : 'Editorial')}</p></TableCell>{!picker && <TableCell className="whitespace-normal tabular-nums">{row.sevenDay.shown.toLocaleString(lang)} {copy('shown')} · {row.sevenDay.taps.toLocaleString(lang)} {copy('taps')}<p className="text-xs text-muted-foreground">{row.sevenDay.from} — {row.sevenDay.to}</p></TableCell>}<TableCell column="actions"><RowActions recordName={row.name} actions={[{ label: picker ? 'Choose target' : 'View surface', icon: picker ? <Check /> : <Eye />, onClick: () => onChoose(row) }]} /></TableCell></TableRow>)}</TableBody></Table>} />;
}
export function AdSurfacePicker({ surfaces, selected, onChange, disabled, allowEditorial = false }: { surfaces: AdSurface[]; selected?: string; onChange: (surface: AdSurface) => void; disabled?: boolean; allowEditorial?: boolean }) {
  const copy = useDashboardCopy(); const chosen = surfaces.find(row => row.key === selected);
  const [kind, setKind] = React.useState<SurfaceKind>(chosen?.surface ?? 'featured');
  const loadCities = React.useCallback(() => loadInsightOptions<{ id: string; name: string; nameEn: string | null }>('/v1/admin/cities'), []);
  const cities = useSubscriberResource(loadCities);
  return <fieldset disabled={disabled} className="min-w-0 space-y-3"><Field label={copy('Surface')}><SubscriberSelect value={kind} onValueChange={value => setKind(value as SurfaceKind)} options={Object.entries(surfaceLabels).map(([value, label]) => ({ value, label: copy(label) }))} disabled={disabled} /></Field>
    <p className="text-sm text-muted-foreground">{copy('Choose all Egypt, a city, its area, a category or a home section from the real surface catalogue.')}</p>
    <SurfaceList picker scope="target" cities={cities.data ?? []} surfaces={surfaces.filter(row => row.surface === kind && row.enabled && (allowEditorial || row.sellable))} selected={selected} onChoose={surface => { if (!disabled) onChange(surface); }} />
    {chosen && <p role="status" className="rounded bg-muted p-3 text-sm">{copy('Selected target')}: {chosen.name}</p>}
  </fieldset>;
}
export function Measures({ value }: { value: AdMeasures }) { const copy = useDashboardCopy(); const { lang } = useDashboardLang(); return <p className="text-sm tabular-nums">{value.shown.toLocaleString(lang)} {copy('shown')} · {value.taps.toLocaleString(lang)} {copy('taps')} · {copy('Tap rate')}: {value.tapRate === null ? '—' : (value.tapRate * 100).toLocaleString(lang, { maximumFractionDigits: 2 }) + '%'} · {value.directions.toLocaleString(lang)} {copy('Directions')} · {value.saves.toLocaleString(lang)} {copy('Saves')}</p>; }
