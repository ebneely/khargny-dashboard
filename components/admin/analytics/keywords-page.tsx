'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin-client';
import { KEYWORD_GROUPS, type ReportPage, type Keyword } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { RecordList, useListAddress } from '../record-list';
import { RecordCell } from '../record-cell';
import { RequestError } from '../subscriber-ui';
import { useDashboardCopy } from '../dashboard-text';
import { PageActions } from '../page-actions';
import { Card, CardContent } from '@/components/ui/card';
import { GROUP_LABELS } from './keyword-editor';

export function KeywordsPage() {
  const params = useSearchParams();
  const address = useListAddress('keywords');
  const { query: search, skip, limit } = address;
  const group = address.get('group');
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const readOnly = useDashboardReadOnly();
  const load = React.useCallback(() => adminApi.get<ReportPage<Keyword>>('/v1/admin/tags', { search, group: KEYWORD_GROUPS.includes(group as typeof KEYWORD_GROUPS[number]) ? group : undefined, skip, limit }), [search, group, skip, limit]);
  const resource = useSubscriberResource(load);
  return <div className="space-y-4"><header className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold">{copy('Keywords')}</h2><PageActions actions={[{ label: 'Create keyword', href: `/dashboard/analytics/keywords/new?${params}`, allowed: !readOnly }]} /></header><p className="text-sm text-muted-foreground">{copy('Keywords and place assignments are current team configuration, not period statistics.')}</p>
    {resource.error ? <RequestError message={copy('Could not load keywords.')} retry={() => { void resource.refetch(); }} /> : <Card><CardContent><RecordList scope="keywords" address={address} records={resource.data?.data ?? []} total={resource.data?.meta.total ?? 0} busy={resource.loading} searchText={(row) => `${row.name} ${row.nameEn} ${row.aliases.join(' ')}`} filters={[{ key: 'group', label: 'All keyword groups', options: KEYWORD_GROUPS.map((group) => ({ value: group, label: GROUP_LABELS[group] })), value: (row) => row.group }]} render={(rows) => <ul className="divide-y">{rows.map((row) => <li key={row.id} className="space-y-2 py-4"><Link href={`/dashboard/analytics/keywords/${row.id}?${params}`} className="inline-block underline underline-offset-4"><RecordCell icon="tag" nameAr={row.name} nameEn={row.nameEn} context={copy(GROUP_LABELS[row.group])} /></Link><p className="break-words text-sm">{copy('Spellings')}: {row.aliases.join(' · ') || copy('None')}</p><p className="text-sm tabular-nums">{row.placeCount.toLocaleString(lang)} {copy('assigned places · now')}</p></li>)}</ul>} /></CardContent></Card>}
  </div>;
}
