'use client';

import * as React from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin-client';
import type { GapRow, ReportPage } from '@/lib/api/search-insights';
import { adsBApi, type Opportunity } from '@/lib/api/ads-round-b';
import { placeCover } from '@/lib/place-list';
import { campaignHref } from '@/lib/ads-round7b';
import { suggestionSurfaces } from '@/lib/analytics-suggestion-surfaces';
import type { AnalyticsOverview } from '@/lib/api/hooks/use-analytics';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useInsightFilters } from './analytics-shell';
import { RecordList, RecordRow } from '../record-list';
import { RecordCell } from '../record-cell';
import { useDashboardCopy } from '../dashboard-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RequestError } from '../subscriber-ui';

export function AnalyticsSuggestions() {
  const { query, period } = useInsightFilters();
  const { from, to, platform, cityId } = query;
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(async () => {
    const gaps = await adminApi.get<ReportPage<GapRow>>('/v1/admin/analytics/search/gaps', { from, to, platform, cityId, skip: 0, limit: 10 });
    const places = platform ? null : await adminApi.get<AnalyticsOverview>('/v1/admin/analytics/overview', { from, to, cityId, topLimit: 10 });
    const opportunities = !platform && ['7', '30', '90'].includes(period) ? await adminApi.get<{ from: string; to: string; data: Opportunity[] }>('/v1/admin/ads/opportunities', { days: Number(period), page: 1, limit: 10 }) : null;
    const surfaces = opportunities?.data.length ? await suggestionSurfaces(page => adsBApi.surfaces(from, to, { detail: 'summary', page, limit: 50 })) : null;
    return { gaps, places, opportunities, surfaces };
  }, [from, to, platform, cityId, period]);
  const report = useSubscriberResource(load);
  const suggestions = [
    ...(report.data?.gaps.data ?? []).filter(row => row.zeroResults > 0).map(row => ({ id: `word-${row.term}`, kind: 'search' as const, name: row.term, action: 'Add it as a keyword', href: `/dashboard/tags/new?prefill=${encodeURIComponent(row.term)}`, evidence: `${row.zeroResults.toLocaleString(lang)} ${copy('searches found nothing in this period')}` })),
    ...(report.data?.opportunities?.from === from && report.data.opportunities.to === to ? report.data.opportunities.data : []).filter((row: Opportunity) => row.visits > 0).flatMap((row: Opportunity) => {
      const surface = report.data?.surfaces?.data.find(item => row.kind === 'area' ? item.surface === 'area' && `${item.scope.cityId}:${item.scope.areaKey}` === row.key : item.surface === 'category' && item.scope.categoryId === row.key);
      return surface?.sellable && (!cityId || surface.scope.cityId === cityId) ? [{ id: `campaign-${row.key}`, kind: 'location' as const, name: surface.name, action: 'Sell a campaign here', href: campaignHref(surface), evidence: `${row.visits.toLocaleString(lang)} ${copy('counted place views')} · ${from} — ${to}` }] : [];
    }),
    ...(report.data?.places?.meta.basis === 'range-events' ? report.data.places.topPlaces : []).filter(row => row.views >= 20 && row.saves < row.views / 10).map(row => ({ id: `place-${row.id}`, kind: undefined, thumbnail: placeCover(row), name: lang === 'ar' ? row.name : row.nameEn || row.name, action: 'Check its photos and prices', href: `/dashboard/places/${row.id}`, evidence: `${row.views.toLocaleString(lang)} ${copy('Views')} · ${row.saves.toLocaleString(lang)} ${copy('Saves')} · ${copy('selected period')}` })),
  ];
  return <Card><CardHeader><CardTitle>{copy('Suggestions')}</CardTitle><p className="text-sm text-muted-foreground">{copy('Each suggestion cites recorded evidence. Missing scopes and unknown counts never become recommendations.')}</p></CardHeader><CardContent>{report.error ? <RequestError message={copy('Could not load suggestions.')} retry={() => { void report.refetch(); }} /> : <RecordList scope="suggestions" records={suggestions} busy={report.loading} searchText={row => `${row.name} ${row.action}`} filters={[{ key: 'type', label: 'All suggestion types', options: [{ value: 'keyword', label: 'Keywords' }, { value: 'place', label: 'Places' }, { value: 'campaign', label: 'Campaigns' }], value: row => row.id.startsWith('word-') ? 'keyword' : row.id.startsWith('campaign-') ? 'campaign' : 'place' }]} empty="No evidence-backed suggestions in the reports available for this period." render={rows => <ul className="divide-y">{rows.map(row => <li key={row.id} className="space-y-2 py-3"><RecordRow actions={<Link className="block max-w-40 break-words text-sm underline" href={row.href}>{copy(row.action)}</Link>}><RecordCell icon={row.id.startsWith('word-') ? 'search' : row.id.startsWith('campaign-') ? 'location' : undefined} thumbnail={'thumbnail' in row ? row.thumbnail : undefined} name={row.name} context={row.evidence} /></RecordRow></li>)}</ul>} />}</CardContent></Card>;
}
