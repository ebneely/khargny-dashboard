'use client';

import * as React from 'react';
import Link from 'next/link';
import { searchOverview } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useInsightFilters } from './analytics-shell';
import { RecordList } from '../record-list';
import { RecordCell } from '../record-cell';
import { useDashboardCopy } from '../dashboard-text';
import { LoadingState, RequestError } from '../subscriber-ui';

export function KeywordPerformance() {
  const { query } = useInsightFilters();
  const { from, to, platform, cityId } = query;
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(() => searchOverview({ from, to, platform, cityId }), [from, to, platform, cityId]);
  const report = useSubscriberResource(load);
  if (report.loading) return <LoadingState />;
  if (report.error) return <RequestError message={copy('Could not load keywords.')} retry={() => { void report.refetch(); }} />;
  const owners = new Map<string, { id: string; name: string; searches: number; zeroResults: number; clicks: number }>();
  for (const term of report.data?.terms ?? []) if (term.keyword) {
    const owner = owners.get(term.keyword.id) ?? { ...term.keyword, searches: 0, zeroResults: 0, clicks: 0 };
    owner.searches += term.searches; owner.zeroResults += term.zeroResults; owner.clicks += term.clicks;
    owners.set(owner.id, owner);
  }
  return <div className="space-y-4"><h2 className="text-xl font-semibold">{copy('Keywords')}</h2><p className="text-sm text-muted-foreground">{copy('Keyword performance comes from owned search terms in this period. Manage the vocabulary in Content → Tags.')}</p><Link href="/dashboard/tags" className="underline">{copy('Manage tags')}</Link><RecordList scope="keyword-performance" records={[...owners.values()].sort((first, second) => second.searches - first.searches)} searchText={row => row.name} filters={[{ key: 'found', label: 'All search outcomes', options: [{ value: 'gaps', label: 'Nothing found' }], value: row => row.zeroResults > 0 ? 'gaps' : 'found' }]} empty="No owned keyword searches in this period." render={rows => <ul className="divide-y">{rows.map(row => <li key={row.id} className="space-y-2 py-3"><RecordCell icon="tag" name={row.name} /><p className="text-sm tabular-nums">{row.searches.toLocaleString(lang)} {copy('Searches')} · {row.zeroResults.toLocaleString(lang)} {copy('Nothing found')} · {row.clicks.toLocaleString(lang)} {copy('Result taps')}</p></li>)}</ul>} /></div>;
}
