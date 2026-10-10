'use client';

import * as React from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import type { AnalyticsTopPlace } from '@/lib/api/hooks/use-analytics';
import { engagementNumber } from '@/lib/engagement';
import { placeCover } from '@/lib/place-list';
import { useInsightFilters } from './analytics-shell';
import { RecordList } from '../record-list';
import { RecordCell } from '../record-cell';
import { useDashboardCopy } from '../dashboard-text';
import { RequestError } from '../subscriber-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type LikesReport = { series: { date: string; likes?: number }[]; data: AnalyticsTopPlace[]; meta: { page: number; limit: number; total: number } };
export function AnalyticsLikes() {
  const { query } = useInsightFilters();
  const { from, to, cityId, platform } = query;
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(async () => {
    if (platform) return null;
    const first = await adminApi.get<LikesReport>('/v1/admin/analytics/likes', { from, to, cityId, page: 1, limit: 50 });
    for (let page = 2; first.data.length < first.meta.total; page++) {
      const next = await adminApi.get<LikesReport>('/v1/admin/analytics/likes', { from, to, cityId, page, limit: 50 });
      if (!next.data.length) throw new Error('Incomplete likes report');
      first.data.push(...next.data);
    }
    return first;
  }, [from, to, cityId, platform]);
  const report = useSubscriberResource(load);
  return <Card><CardHeader><CardTitle>{copy('Likes in the selected period')}</CardTitle><p className="text-sm text-muted-foreground">{copy('New committed likes, not net of unlikes. Current place likes are a separate count.')}</p></CardHeader><CardContent className="space-y-4">{report.error ? <RequestError message={copy('Could not load likes.')} retry={() => { void report.refetch(); }} /> : !report.loading && !report.data ? <p>{copy('The likes report does not support a platform split. Clear the platform filter to read it.')} —</p> : <><h3 className="font-medium">{copy('Likes per day')}</h3><RecordList scope="likes-days" records={report.data?.series ?? []} busy={report.loading} searchText={row => row.date} filters={[{ key: 'activity', label: 'All activity', options: [{ value: 'likes', label: 'With likes' }, { value: 'none', label: 'No likes' }], value: row => row.likes ? 'likes' : 'none' }]} render={rows => <ul className="divide-y">{rows.map(row => <li key={row.date} className="flex items-start justify-between gap-3 py-3"><RecordCell icon="calendar" name={row.date} /><span className="tabular-nums">{engagementNumber(row.likes, lang)} {copy('Likes')}</span></li>)}</ul>} /><h3 className="font-medium">{copy('Most liked places')}</h3><p className="text-sm text-muted-foreground">{copy('Ranked by new likes in this period, not the current total.')}</p><RecordList scope="most-liked" records={report.data?.data ?? []} busy={report.loading} searchText={row => `${row.name} ${row.nameEn}`} filters={[{ key: 'city', label: 'All cities', options: Array.from(new Set((report.data?.data ?? []).map(row => row.cityAr ?? row.cityEn ?? '').filter(Boolean))).map(city => ({ value: city, label: city })), value: row => row.cityAr ?? row.cityEn ?? '' }]} render={rows => <ul className="divide-y">{rows.map(row => <li key={row.id} className="flex items-start justify-between gap-3 py-3"><Link href={`/dashboard/places/${row.id}`}><RecordCell nameAr={row.name} nameEn={row.nameEn} thumbnail={placeCover(row)} /></Link><span className="tabular-nums">{engagementNumber(row.likes, lang)} {copy('Likes')}</span></li>)}</ul>} /></>}</CardContent></Card>;
}
