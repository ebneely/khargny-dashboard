'use client';

// Decision 0007: the words customers taught the search, kept apart from the team's keywords. The team promotes a learned
// word into a team keyword or blocks it for that place; nothing here is decided by one visitor.
import * as React from 'react';
import { Ban, MapPin, Star, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from '@/components/lang-link';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { dashboardDateTime } from '@/lib/dashboard-date';
import { localeFor } from '@/lib/locale';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { RecordList, RecordRow, useListAddress } from '../record-list';
import { RecordCell } from '../record-cell';
import { RowActions, type RowAction } from '../row-actions';
import { SegmentedControl } from '../segmented-control';
import { DateCell } from '../date-cell';
import { RequestError, StatusBadge } from '../subscriber-ui';
import { useDashboardCopy } from '../dashboard-text';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type LearnedKeyword = {
  term: string; placeId: string; placeName: string; placeNameEn: string | null; status: 'learned' | 'promoted' | 'blocked';
  visitors: number; evidence: number; pickRate: number; weight: number; lastTapAt: string | null; assignedAt: string;
};
type Summary = {
  counts: { status: string; n: number }[];
  lastRun: { at: string; touched: number; assigned: number; faded: number; removed: number; ms: number } | null;
  drops: { day: string; reason: string; n: number }[];
};
const VIEWS = ['new', 'learned', 'promoted', 'blocked'] as const;
type View = (typeof VIEWS)[number];
const EMPTY: Record<View, string> = {
  new: 'No new learned words this week. A word appears here after several different visitors search it, pick the same place and keep picking it.',
  learned: 'No learned words yet.',
  promoted: 'No learned word has been promoted to a team keyword yet.',
  blocked: 'No blocked words.',
};
const STATUS_LABEL = { learned: 'Learned', promoted: 'Team keyword', blocked: 'Blocked' } as const;

/** The evidence behind one learned word, the same four numbers wherever a learned word is listed. */
export function LearnedEvidence({ row }: { row: LearnedKeyword }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const locale = localeFor(lang);
  const percent = (value: number) => value.toLocaleString(locale, { style: 'percent', maximumFractionDigits: 0 });
  return <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
    <div><dt className="text-muted-foreground">{copy('Different visitors')}</dt><dd className="tabular-nums">{row.visitors.toLocaleString(locale)}</dd></div>
    <div><dt className="text-muted-foreground">{copy('Pick rate')}</dt><dd className="tabular-nums">{percent(row.pickRate)}</dd></div>
    <div><dt className="text-muted-foreground">{copy('Weight vs a team keyword')}</dt><dd className="tabular-nums">{row.status === 'learned' ? percent(row.weight) : '—'}</dd></div>
    <div><dt className="text-muted-foreground">{copy('Last tap')}</dt><dd>{row.lastTapAt ? <DateCell value={row.lastTapAt} /> : '—'}</dd></div>
  </dl>;
}

export function LearnedKeywords() {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const readOnly = useDashboardReadOnly();
  const locale = localeFor(lang);
  const address = useListAddress('learned');
  const requested = address.get('view', 'new') as View;
  const view = VIEWS.includes(requested) ? requested : 'new';
  const { query: q, skip, limit } = address;
  const [busyKey, setBusyKey] = React.useState('');

  const loadList = React.useCallback(() => adminApi.get<{ items: LearnedKeyword[]; total: number }>('/v1/admin/algorithm/keywords', {
    status: view === 'new' ? 'learned' : view, days: view === 'new' ? 7 : undefined, q: q || undefined, page: Math.floor(skip / limit) + 1, limit,
  }), [view, q, skip, limit]);
  const list = useSubscriberResource(loadList);
  const loadSummary = React.useCallback(() => adminApi.get<Summary>('/v1/admin/algorithm/keywords/summary'), []);
  const summary = useSubscriberResource(loadSummary);

  const count = (status: string) => summary.data?.counts.find((entry) => entry.status === status)?.n;
  const today = summary.data?.drops.filter((drop) => drop.day === summary.data?.drops[0]?.day) ?? [];
  const dropped = (reason: string) => (today.find((drop) => drop.reason === reason)?.n ?? 0).toLocaleString(locale);
  const run = summary.data?.lastRun;

  const act = async (row: LearnedKeyword, action: 'promote' | 'block' | 'unblock', done: string) => {
    if (busyKey) return;
    setBusyKey(`${row.term}|${row.placeId}`);
    try {
      await adminApi.post(`/v1/admin/algorithm/keywords/${action}`, { term: row.term, placeId: row.placeId });
      toast.success(copy(done));
      await Promise.all([list.refetch(), summary.refetch()]);
    } catch (error) {
      toast.error(error instanceof AdminApiError && error.status === 403 ? copy('Only an admin can change learned words.') : copy('Could not change the learned word. Try again.'));
    } finally { setBusyKey(''); }
  };
  const actions = (row: LearnedKeyword): RowAction[] => {
    const open: RowAction = { label: 'Open the place', icon: <MapPin aria-hidden="true" />, href: `/dashboard/places/${row.placeId}` };
    if (readOnly) return [open];
    const busy = busyKey === `${row.term}|${row.placeId}`;
    if (row.status === 'blocked') return [{ label: 'Unblock: let it be learned again', icon: <Undo2 aria-hidden="true" />, disabled: busy, onClick: () => { void act(row, 'unblock', 'Unblocked. The word can be learned again for this place.'); } }, open];
    if (row.status === 'promoted') return [open, { label: 'Block for this place', icon: <Ban aria-hidden="true" />, destructive: true, disabled: busy, onClick: () => { void act(row, 'block', 'Blocked. The word will not be learned again for this place.'); } }];
    return [
      { label: 'Promote to a team keyword', icon: <Star aria-hidden="true" />, disabled: busy, onClick: () => { void act(row, 'promote', 'Promoted. It is a team keyword of this place now, at full weight.'); } },
      open,
      { label: 'Block for this place', icon: <Ban aria-hidden="true" />, destructive: true, disabled: busy, onClick: () => { void act(row, 'block', 'Blocked. The word will not be learned again for this place.'); } },
    ];
  };

  return <div className="space-y-6">
    <div className="space-y-1"><h2 className="text-xl font-semibold">{copy('Learned words')}</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">{copy('Words customers taught the search: several different visitors searched the word and picked the same place. A learned word ranks below a team keyword and fades when the taps stop.')}</p></div>

    <Card><CardHeader><CardTitle>{copy('Now')}</CardTitle><CardDescription>{copy('The search checks for new evidence every hour.')}</CardDescription></CardHeader>
      <CardContent className="space-y-4">{summary.error ? <RequestError message={copy('Could not load the learned-word numbers.')} retry={() => { void summary.refetch(); }} /> : <>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          {([['Learned words', count('learned')], ['Promoted to team keywords', count('promoted')], ['Blocked', count('blocked')]] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{copy(label)}</dt><dd className="text-lg font-semibold tabular-nums">{summary.data ? (value ?? 0).toLocaleString(locale) : '—'}</dd></div>)}
          <div><dt className="text-muted-foreground">{copy('Last check')}</dt><dd>{run ? dashboardDateTime(run.at, lang) : summary.data ? copy('Not run yet') : '—'}</dd></div>
        </dl>
        {run && <p className="text-sm text-muted-foreground"><span className="tabular-nums">{run.assigned.toLocaleString(locale)}</span> {copy('learned,')} <span className="tabular-nums">{run.faded.toLocaleString(locale)}</span> {copy('fading,')} <span className="tabular-nums">{run.removed.toLocaleString(locale)}</span> {copy('removed in the last check.')}</p>}
        {summary.data && <p className="rounded-lg bg-muted px-3 py-2 text-sm">{copy('Actions not counted today:')} <span className="tabular-nums">{dropped('bot')}</span> {copy('from bots or datacenters,')} <span className="tabular-nums">{dropped('speed')}</span> {copy('faster than the speed limit.')}</p>}
      </>}</CardContent></Card>

    <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{copy('Review')}</CardTitle>
      <SegmentedControl label={copy('Which learned words')} value={view} onValueChange={(value) => address.change('view', value === 'new' ? '' : value)} options={[
        { value: 'new', label: copy('New this week') }, { value: 'learned', label: copy('All learned'), count: count('learned') },
        { value: 'promoted', label: copy('Promoted'), count: count('promoted') }, { value: 'blocked', label: copy('Blocked'), count: count('blocked') },
      ]} /></CardHeader>
      <CardContent>{list.error ? <RequestError message={copy('Could not load the learned words.')} retry={() => { void list.refetch(); }} /> :
        <RecordList scope="learned" address={address} records={list.data?.items ?? []} total={list.data?.total ?? 0} busy={list.loading} searchText={(row) => row.term} empty={EMPTY[view]}
          render={(rows) => <ul className="divide-y">{rows.map((row) => <li key={`${row.term}|${row.placeId}`} className="space-y-3 py-4">
            <RecordRow actions={<RowActions actions={actions(row)} recordName={row.term} />}>
              <RecordCell icon="tag" name={row.term} chips={<StatusBadge status={row.status === 'learned' ? 'active' : row.status === 'promoted' ? 'scheduled' : 'disabled'}>{copy(STATUS_LABEL[row.status])}</StatusBadge>}
                context={<Link className="underline underline-offset-4" href={`/dashboard/places/${row.placeId}`}><bdi>{lang === 'ar' ? row.placeName : row.placeNameEn || row.placeName}</bdi></Link>} />
            </RecordRow>
            <LearnedEvidence row={row} />
          </li>)}</ul>} />}
      </CardContent></Card>
  </div>;
}

type TeamPlace = { placeId: string; placeName: string; keyword: string };

/** One search word: the places that carry it as a team keyword, and the places that learned it. */
export function TermKeywordPlaces({ term }: { term: string }) {
  const copy = useDashboardCopy();
  const load = React.useCallback(() => adminApi.get<{ term: string; team: TeamPlace[]; learned: LearnedKeyword[] }>('/v1/admin/algorithm/keywords/term', { term }), [term]);
  const resource = useSubscriberResource(load);
  const learned = (resource.data?.learned ?? []).filter((row) => row.term === resource.data?.term && row.status === 'learned');
  return <Card><CardHeader><CardTitle>{copy('Places for this word')}</CardTitle><CardDescription>{copy('Team keywords count fully in search. Learned words count by their weight.')}</CardDescription></CardHeader>
    <CardContent className="space-y-6">{resource.error ? <RequestError message={copy('Could not load the places for this word.')} retry={() => { void resource.refetch(); }} /> : resource.loading ? <div role="status" className="h-24 animate-pulse rounded bg-muted"><span className="sr-only">{copy('Loading…')}</span></div> : <>
      <section className="space-y-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><Star className="size-4 text-primary" aria-hidden="true" />{copy('Team keyword on')}</h3>
        {resource.data?.team.length ? <ul className="divide-y">{resource.data.team.map((row) => <li key={row.placeId} className="py-3"><Link className="inline-block underline underline-offset-4" href={`/dashboard/places/${row.placeId}`}><RecordCell icon="location" name={row.placeName} context={row.keyword} /></Link></li>)}</ul> : <p className="text-sm text-muted-foreground">{copy('No place carries this word as a team keyword.')}</p>}</section>
      <section className="space-y-2"><h3 className="text-sm font-semibold">{copy('Learned for')}</h3>
        {learned.length ? <ul className="divide-y">{learned.map((row) => <li key={row.placeId} className="space-y-3 py-3"><Link className="inline-block underline underline-offset-4" href={`/dashboard/places/${row.placeId}`}><RecordCell icon="location" nameAr={row.placeName} nameEn={row.placeNameEn ?? undefined} /></Link><LearnedEvidence row={row} /></li>)}</ul> : <p className="text-sm text-muted-foreground">{copy('No place has learned this word yet.')}</p>}</section>
    </>}</CardContent></Card>;
}
