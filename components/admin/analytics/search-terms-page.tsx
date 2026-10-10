'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin-client';
import type { ReportPage, TermRow } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useInsightFilters } from './analytics-shell';
import { RecordList, useListAddress } from '../record-list';
import { RecordCell } from '../record-cell';
import { RequestError } from '../subscriber-ui';
import { useDashboardCopy } from '../dashboard-text';
import { Card, CardContent } from '@/components/ui/card';

export function SearchTermsPage() {
  const { query } = useInsightFilters();
  const { from, to, platform, cityId } = query;
  const address = useListAddress('terms');
  const { query: q, skip, limit } = address;
  const requested = address.get('sort', 'searches');
  const sort = ['searches', 'zero_results', 'low_clicks'].includes(requested) ? requested : 'searches';
  const copy = useDashboardCopy();
  const params = useSearchParams();
  const { lang } = useDashboardLang();
  const load = React.useCallback(() => adminApi.get<ReportPage<TermRow>>('/v1/admin/analytics/search/terms', { from, to, platform, cityId, q, skip, limit, sort }), [from, to, platform, cityId, q, skip, limit, sort]);
  const resource = useSubscriberResource(load);
  const number = (value: number) => value.toLocaleString(lang);
  return <div className="space-y-4"><h2 className="text-xl font-semibold">{copy('Search terms')}</h2><p className="text-sm text-muted-foreground">{copy('Trend compares searches with the previous equal-length period. Taps can exceed searches.')}</p>
    {resource.error ? <RequestError message={copy('Could not load search terms.')} retry={() => { void resource.refetch(); }} /> : <Card><CardContent><RecordList scope="terms" address={address} records={resource.data?.data ?? []} total={resource.data?.meta.total ?? 0} busy={resource.loading} searchText={(row) => row.term} filters={[{ key: 'sort', label: 'Sort search terms', defaultValue: 'searches', options: [{ value: 'searches', label: 'Most searches' }, { value: 'zero_results', label: 'Most empty searches' }, { value: 'low_clicks', label: 'Fewest taps per search' }], value: () => '' }]} render={(rows) => <ul className="divide-y">{rows.map((row) => <li key={row.term} className="space-y-3 py-4"><Link className="inline-block underline underline-offset-4" href={`/dashboard/analytics/search-terms/${encodeURIComponent(row.term)}?${params}`}><RecordCell icon="search" name={row.term} context={row.keyword ? row.keyword.name : copy('No owning keyword')} /></Link><dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">{[
      ['Searches', number(row.searches)], ['Nothing found', number(row.zeroResults)], ['Result taps', number(row.clicks)], ['Taps per search', number(row.clickShare)], ['Trend', row.trend.share === null ? copy('No previous searches') : row.trend.share.toLocaleString(lang, { style: 'percent', maximumFractionDigits: 1 })],
    ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{copy(label)}</dt><dd className="tabular-nums">{value}</dd></div>)}</dl></li>)}</ul>} /></CardContent></Card>}
  </div>;
}
