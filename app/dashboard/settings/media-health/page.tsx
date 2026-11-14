'use client';

import * as React from 'react';
import Link from '@/components/lang-link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { Pager } from '@/components/admin/pager';
import { LoadingState, RequestError } from '@/components/admin/subscriber-ui';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';

type HealthRow = { id: string; placeId?: string; name?: string; nameEn?: string | null; placeName?: string; width?: number | null; height?: number | null; type?: 'image' | 'video'; occurrences?: number; distinctPlaceCount?: number };
interface HealthPage { data: HealthRow[]; meta: { total: number; totalGroups?: number } }
const PAGE = 20;

const CHECKS = [
  { route: 'places-without-media', title: 'Places with no photos or videos', description: 'Live or draft places that have nothing to show.' },
  { route: 'low-resolution', title: 'Small photos', description: 'Photos under 1200 px on their longest side, or with no recorded size.' },
  { route: 'duplicates', title: 'The same photo more than once', description: 'Files that are byte-for-byte the same, on one place or across places.' },
] as const;

export default function MediaHealthPage() {
  return <div className="flex flex-col gap-6">
    <div>
      <Link href="/dashboard/settings" className="text-sm text-muted-foreground hover:text-foreground"><DashboardText>← Settings</DashboardText></Link>
      <h1 className="mt-3 font-display text-2xl font-semibold"><DashboardText>Media health</DashboardText></h1>
      <p className="mt-2 text-sm text-muted-foreground"><DashboardText>Places whose photos need work. Open a place to fix its Media tab.</DashboardText></p>
    </div>
    {CHECKS.map(check => <HealthCheck key={check.route} {...check} />)}
  </div>;
}

function HealthCheck({ route, title, description }: (typeof CHECKS)[number]) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  const [skip, setSkip] = React.useState(0);
  const load = React.useCallback(() => adminApi.get<HealthPage>(`/v1/admin/media-health/${route}`, { page: skip / PAGE + 1, limit: PAGE }), [route, skip]);
  const resource = useSubscriberResource(load);
  const rows = resource.data?.data ?? [];
  const detail = (row: HealthRow) => route === 'low-resolution'
    ? row.width && row.height ? `${row.width} × ${row.height} px` : copy('Size not recorded')
    : route === 'duplicates' ? `${copy(row.type === 'video' ? 'Video' : 'Photo')}, ${row.occurrences} ${copy('copies in')} ${row.distinctPlaceCount} ${copy(row.distinctPlaceCount === 1 ? 'place' : 'places')}` : '';
  return <Card>
    <CardHeader><CardTitle>{copy(title)}{resource.data && <span className="ms-2 tabular-nums text-muted-foreground">{resource.data.meta.total}</span>}</CardTitle><CardDescription>{copy(description)}</CardDescription></CardHeader>
    <CardContent>
      {resource.loading && !resource.data ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load this check.')} retry={() => { void resource.refetch(); }} /> : <>
        {!rows.length && <p className="py-2 text-sm text-muted-foreground">{copy('Nothing to fix.')}</p>}
        <ul className="divide-y">{rows.map(row => {
          const placeId = row.placeId ?? row.id;
          return <li key={`${row.id}-${placeId}`} className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
            <Link className="font-medium underline-offset-4 hover:underline" href={`/dashboard/places/${placeId}?tab=photos`}>{row.placeName ?? pick(row.name ?? '', row.nameEn ?? null)}</Link>
            {detail(row) && <span className="text-sm tabular-nums text-muted-foreground">{detail(row)}</span>}
          </li>;
        })}</ul>
        <Pager skip={skip} pageSize={PAGE} total={resource.data?.meta.total ?? 0} count={rows.length} busy={resource.loading} onPrevious={() => setSkip(Math.max(0, skip - PAGE))} onNext={() => setSkip(skip + PAGE)} />
      </>}
    </CardContent>
  </Card>;
}
