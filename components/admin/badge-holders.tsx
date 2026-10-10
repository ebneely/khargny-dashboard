'use client';

import * as React from 'react';
import Link from 'next/link';
import { ExternalLink, Ban, PinOff } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { badgesApi, type BadgeHolder, type BadgeOverride, type BadgeRule, type ManagedBadge } from '@/lib/api/badges';
import type { AdminCity } from '@/lib/api/types';
import type { SubscriberPlace } from '@/lib/api/subscribers';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useBadgePreview } from '@/lib/api/hooks/use-badge-preview';
import { badgeValueText } from '@/lib/badge-rules';
import { RecordCell } from './record-cell';
import { RecordList } from './record-list';
import { RowActions } from './row-actions';
import { useDashboardCopy } from './dashboard-text';
import { LoadingState, RequestError, StatusBadge, useSubscriberText } from './subscriber-ui';

export function BadgeHolders({ badge, cityId, cities, revision, previewRule, canWrite, onExclude, onRemovePin }: { badge: ManagedBadge; cityId: string; cities: AdminCity[]; revision: number; previewRule: BadgeRule | null; canWrite: boolean; onExclude: (place: SubscriberPlace) => void; onRemovePin: (override: BadgeOverride) => void }) {
  const copy = useDashboardCopy();
  const { lang, pick } = useSubscriberText();
  const load = React.useCallback(() => badgesApi.holders(badge.key, { cityId: cityId || undefined }), [badge.key, cityId]);
  const resource = useSubscriberResource(load, revision);
  const preview = useBadgePreview(badge.key, previewRule, cityId, canWrite && badge.family === 'achievement');
  const metric = badge.rule?.measure;
  const valueText = (holder: BadgeHolder) => holder.value !== null && metric ? badgeValueText(holder.value, metric, holder.window?.days ?? null, lang) : '—';
  const scopeText = (holder: BadgeHolder) => [holder.scope?.city ? pick(holder.scope.city.name, holder.scope.city.nameEn) : (() => { const city = cities.find((row) => row.id === holder.cityId); return city ? pick(city.name, city.nameEn) : null; })(), holder.scope?.category && pick(holder.scope.category.name, holder.scope.category.nameEn)].filter(Boolean).join(' · ') || '—';
  const rank = (holder: BadgeHolder) => holder.source === 'pinned' ? <StatusBadge status="paused">{copy('Pinned')}</StatusBadge> : holder.rank?.toLocaleString(lang) ?? '—';
  const closest = resource.data?.nextCandidates[0];
  return <div className="min-w-0 space-y-3">
    {preview.loading ? <p role="status" className="text-sm text-muted-foreground">{copy('Loading…')}</p> : preview.error ? <RequestError message={copy('Could not load badge preview. Change a rule field to retry.')} /> : preview.data && <p aria-live="polite" className="text-sm text-muted-foreground">{copy('With this rule')}: {preview.data.awards.length.toLocaleString(lang)} {copy('places would hold it')} ({copy('now')} {resource.data?.holders.length.toLocaleString(lang) ?? '—'})</p>}
    <h3 className="font-medium">{copy('Holders now')}</h3>
    {resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load holders. Try again.')} retry={() => { void resource.refetch(); }} /> : <>{!resource.data?.holders.length && <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground"><p>{copy(badge.family === 'status' ? 'No places hold this status badge yet.' : 'No place has reached this yet.')}</p>{badge.rule && <p>{copy('Floor')}: {badgeValueText(badge.rule.floor, badge.rule.measure, badge.rule.windowDays, lang)}{closest && <> · {copy('Closest')}: {pick(closest.name, closest.nameEn)} · {closest.value.toLocaleString(lang)} {closest.value < badge.rule.floor ? <>{copy('needs')} {badge.rule.floor.toLocaleString(lang)}</> : copy('Below the winning ranks')}</>}</p>}</div>}<RecordList scope={`holders-${badge.key}`} records={resource.data?.holders ?? []} searchText={(holder) => `${holder.name} ${holder.nameEn ?? ''} ${scopeText(holder)}`} filters={[{ key: 'city', label: 'All cities', options: cities.map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) })), value: (holder) => holder.cityId }, ...(badge.family === 'achievement' ? [{ key: 'source', label: 'All holders', options: [{ value: 'earned', label: 'Earned' }, { value: 'pinned', label: 'Pinned' }], value: (holder: BadgeHolder) => holder.source }] : [])]} render={(visible) => <div data-list-table="badges" className="min-w-0"><Table layout="list"><TableHeader><TableRow><TableHead>{copy('Place')}</TableHead><TableHead>{copy('City')}</TableHead><TableHead className="text-end">{copy('Rank')}</TableHead><TableHead className="text-end">{copy('Value')}</TableHead><TableHead column="actions">{copy('Actions')}</TableHead></TableRow></TableHeader><TableBody>{visible.map((holder) => {
      const id = holder.placeId ?? holder.id ?? '';
      const name = pick(holder.name, holder.nameEn);
      const href = `/dashboard/places/${id}`;
      return <TableRow key={id}><TableCell><Link href={href}><RecordCell nameAr={holder.name} nameEn={holder.nameEn} thumbnail={null} /></Link><div className="mt-2 space-y-1 text-sm text-muted-foreground sm:hidden"><p>{scopeText(holder)}</p><p>{copy('Rank')}: {rank(holder)}</p><p>{valueText(holder)}</p></div></TableCell><TableCell>{scopeText(holder)}</TableCell><TableCell className="text-end tabular-nums">{rank(holder)}</TableCell><TableCell className="text-end tabular-nums">{valueText(holder)}</TableCell><TableCell column="actions">{canWrite ? <RowActions recordName={name} actions={[{ label: copy('Open place'), icon: <ExternalLink aria-hidden="true" />, href }, ...(badge.family === 'achievement' ? [{ label: copy('Exclude from this badge'), icon: <Ban aria-hidden="true" />, onClick: () => onExclude({ id, name: holder.name, nameEn: holder.nameEn, slug: holder.slug ?? '', cityId: holder.cityId }) }] : []), ...(holder.source === 'pinned' && holder.override ? [{ label: copy('Remove pin'), icon: <PinOff aria-hidden="true" />, onClick: () => onRemovePin(holder.override!), destructive: true }] : [])]} /> : <Link className="text-sm underline" href={href}>{copy('Open place')}</Link>}</TableCell></TableRow>;
    })}</TableBody></Table></div>} /></>}
    {resource.data && resource.data.nextCandidates.length > 0 && <details><summary data-ro-allow="true" className="cursor-pointer text-sm font-medium">{copy('Just below the line')} ({resource.data.nextCandidates.length.toLocaleString(lang)})</summary><div className="mt-3"><RecordList scope={`candidates-${badge.key}`} records={resource.data.nextCandidates} searchText={(candidate) => `${candidate.name} ${candidate.nameEn ?? ''} ${candidate.scope?.city ? `${candidate.scope.city.name} ${candidate.scope.city.nameEn ?? ''}` : ''}`} filters={[{ key: 'city', label: 'All cities', options: cities.map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) })), value: (candidate) => candidate.cityId }]} render={(visible) => <ul className="divide-y">{visible.map((candidate) => <li key={candidate.id} className="flex min-h-14 flex-wrap items-center justify-between gap-2 py-3"><Link href={`/dashboard/places/${candidate.id}`}><RecordCell nameAr={candidate.name} nameEn={candidate.nameEn} thumbnail={null} /></Link><p className="text-sm tabular-nums text-muted-foreground">{metric && badgeValueText(candidate.value, metric, resource.data?.rule?.windowDays ?? null, lang)} · {candidate.scope?.city && pick(candidate.scope.city.name, candidate.scope.city.nameEn)} · {copy('Rank')} {candidate.position.toLocaleString(lang)} {copy('of')} {candidate.candidates.toLocaleString(lang)} · {badge.rule && candidate.value < badge.rule.floor ? `${copy('needs')} ${badge.rule.floor.toLocaleString(lang)}` : copy('Below the winners')}</p></li>)}</ul>} /></div></details>}
  </div>;
}
