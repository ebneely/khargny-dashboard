'use client';

import * as React from 'react';
import { Activity, ArrowUpRight, Eye, RefreshCw, Route, Users } from 'lucide-react';
import Link from '@/components/lang-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useAnalyticsOverview } from '@/lib/api/hooks/use-analytics';
import { loadLiveBundle } from '@/lib/api/live-status';
import { useDashboardCopy } from '../dashboard-text';
import { RequestError } from '../subscriber-ui';
import { Answers, Insights } from '../analytics/numbers-smart';
import { InsightsSummary } from '../insights/insights-summary';
import { useSitePeople } from '../people-switch';
import { useInsightFilters } from './insight-filters';
import { CountUp } from './count-up';

/** Decision 0006, Today: the site's numbers and the fixed answers, for the chosen window. */
export function AlgorithmTodayPage() {
  const copy = useDashboardCopy();
  const { window, people, query } = useInsightFilters();
  const site = useSitePeople(window);
  const overview = useAnalyticsOverview({ from: query.from, to: query.to, window: query.window });
  return <div className="space-y-8">
    <section aria-labelledby="algorithm-headline" className="space-y-3">
      <div><h2 id="algorithm-headline" className="text-xl font-semibold">{copy("Today's answer")}</h2><p className="mt-1 text-sm text-muted-foreground">{copy('Every number here counts back from now. The count switch changes the values that have people prepared.')}</p></div>
      {overview.isError ? <RequestError message={copy('Could not load analytics.')} retry={() => { void overview.refetch(); }} /> : <>
        <InsightsSummary data={overview.data} loading={overview.isLoading} people={site} mode={people} />
        <Link href="/dashboard/places" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{copy('Open the place list')}<ArrowUpRight aria-hidden="true" className="size-4 rtl:-scale-x-100" /></Link>
      </>}
    </section>
    <LiveNow />
    <Answers window={window} />
    <Insights window={window} />
  </div>;
}

/** Right now, one snapshot with a Refresh; it is deliberately not polled so the page stays calm. */
function LiveNow() {
  const copy = useDashboardCopy();
  const load = React.useCallback(() => loadLiveBundle('5m'), []);
  const res = useSubscriberResource(load);
  const totals = res.data?.summary.totals;
  const tiles = [
    { label: 'People online', value: totals?.visitors, icon: Users },
    { label: 'Visits started', value: totals?.visits, icon: Activity },
    { label: 'Pages viewed', value: totals?.pages, icon: Eye },
    { label: 'Actions', value: totals?.actions, icon: Route },
  ];
  return <Card>
    <CardHeader className="flex flex-wrap items-start justify-between gap-3">
      <div><CardTitle>{copy('Right now')}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{copy('Always live; it ignores the window.')}</p></div>
      <Button data-ro-allow="true" type="button" variant="outline" size="sm" disabled={res.loading} onClick={() => { void res.refetch(); }}><RefreshCw aria-hidden="true" className={res.loading ? 'animate-spin motion-reduce:animate-none' : undefined} />{copy('Refresh')}</Button>
    </CardHeader>
    <CardContent>
      {res.loading ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy="true">{tiles.map((tile) => <div key={tile.label} className="h-24 animate-pulse rounded-lg bg-muted" />)}</div>
        : res.error || !res.data || !totals ? <RequestError message={copy('Could not load the live snapshot.')} retry={() => { void res.refetch(); }} />
          : <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{tiles.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-lg border border-border p-4">
            <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4" aria-hidden="true" />{copy(label)}</dt>
            <dd className="mt-2 font-display text-2xl font-semibold tabular-nums"><CountUp value={value} /></dd>
          </div>)}</dl>}
    </CardContent>
  </Card>;
}
