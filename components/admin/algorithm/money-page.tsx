'use client';

import * as React from 'react';
import Link from '@/components/lang-link';
import { ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { adminApi } from '@/lib/api/admin-client';
import { readCampaignList } from '@/lib/ads-campaign-list';
import type { AdCampaign } from '@/lib/api/ads';
import { plansApi, type PlanCatalogueRow } from '@/lib/api/plans';
import type { SubscriberSummary } from '@/lib/api/subscribers';
import { useDashboardCopy } from '../dashboard-text';
import { MoneyText, RequestError } from '../subscriber-ui';

/** Decision 0006 Money: one read-only summary; every action stays on the Money pages. */
export function AlgorithmMoneyPage() {
  const copy = useDashboardCopy();
  const summary = useSubscriberResource(() => adminApi.get<SubscriberSummary>('/v1/admin/subscribers/summary'));
  const ads = useSubscriberResource(() => readCampaignList(() => adminApi.get('/v1/admin/ads/campaigns', { state: 'live' })));
  const plans = useSubscriberResource<PlanCatalogueRow[]>(plansApi.catalogue);
  const totals = React.useMemo(() => {
    const rows = ads.data ?? [];
    return {
      ads: rows.length,
      impressions: rows.reduce((sum, row) => sum + (row.totals?.impressions ?? 0), 0),
      taps: rows.reduce((sum, row) => sum + (row.totals?.taps ?? 0), 0),
      amount: rows.reduce((sum, row) => sum + Number(row.amountPaid ?? 0), 0),
      top: [...rows].sort((a: AdCampaign, b: AdCampaign) => (b.totals?.impressions ?? 0) - (a.totals?.impressions ?? 0)).slice(0, 8),
    };
  }, [ads.data]);
  return <div className="space-y-8">
    <section aria-labelledby="algorithm-money-top" className="space-y-3">
      <div><h2 id="algorithm-money-top" className="text-xl font-semibold">{copy('Is the money side healthy?')}</h2><p className="mt-1 text-sm text-muted-foreground">{copy('Money is counted in EGP, not people.')}</p></div>
      {summary.error ? <RequestError message={copy('Could not load the money summary.')} retry={() => { void summary.refetch(); }} />
        : <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card><CardContent><p className="text-sm text-muted-foreground">{copy('Active owners')}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{summary.loading ? '—' : (summary.data?.active ?? 0).toLocaleString('en-US')}</p></CardContent></Card>
          <Card><CardContent><p className="text-sm text-muted-foreground">{copy('Revenue this month')}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{summary.loading ? '—' : <MoneyText value={summary.data?.revenueThisMonth ?? null} mutedUnit />}</p></CardContent></Card>
          <Card><CardContent><p className="text-sm text-muted-foreground">{copy('Renewing within 30 days')}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{summary.loading ? '—' : (summary.data?.expiringWithin30Days ?? 0).toLocaleString('en-US')}</p></CardContent></Card>
          <Card><CardContent><p className="text-sm text-muted-foreground">{copy('Running ads')}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{ads.loading ? '—' : totals.ads.toLocaleString('en-US')}</p></CardContent></Card>
        </div>}
    </section>

    <section aria-labelledby="algorithm-ads" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="algorithm-ads" className="text-xl font-semibold">{copy('Running ads')}</h2><p className="mt-1 text-sm text-muted-foreground">{copy('Shown, taps and the amount recorded on each running ad.')}</p></div><Link href="/dashboard/money/ads" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">{copy('Open Money')}<ArrowUpRight aria-hidden="true" className="size-4 rtl:-scale-x-100" /></Link></div>
      {ads.error ? <RequestError message={copy('Could not load the running ads.')} retry={() => { void ads.refetch(); }} />
        : <Card><CardContent>
          {ads.loading ? <div className="h-40 animate-pulse rounded-lg bg-muted" aria-busy="true" /> : !totals.top.length ? <p className="py-4 text-sm text-muted-foreground">{copy('No ads are running.')}</p>
            : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
              <thead><tr className="text-muted-foreground"><th className="py-2 text-start font-normal">{copy('Place')}</th><th className="py-2 text-end font-normal">{copy('Shown')}</th><th className="py-2 text-end font-normal">{copy('Taps')}</th><th className="py-2 text-end font-normal">{copy('Tap rate')}</th><th className="py-2 text-end font-normal">{copy('Amount recorded')}</th></tr></thead>
              <tbody className="divide-y">{totals.top.map((row) => <tr key={row.id} className="h-12"><td className="max-w-[280px] truncate py-2 pe-3 font-medium" dir="auto">{row.place?.name ?? row.advertiserName}</td><td className="py-2 text-end tabular-nums">{(row.totals?.impressions ?? 0).toLocaleString('en-US')}</td><td className="py-2 text-end tabular-nums">{(row.totals?.taps ?? 0).toLocaleString('en-US')}</td><td className="py-2 text-end tabular-nums text-muted-foreground">{row.totals?.ctr === null || row.totals?.ctr === undefined ? '—' : `${(row.totals.ctr * 100).toFixed(1)}%`}</td><td className="py-2 text-end tabular-nums">{Number(row.amountPaid).toLocaleString('en-US')} {row.currency}</td></tr>)}</tbody>
            </table></div>}
        </CardContent></Card>}
    </section>

    <section aria-labelledby="algorithm-plans" className="space-y-3">
      <div><h2 id="algorithm-plans" className="text-xl font-semibold">{copy('Plans and prices')}</h2><p className="mt-1 text-sm text-muted-foreground">{copy('Every plan that is on sale, with its one-month price.')}</p></div>
      {plans.error ? <RequestError message={copy('Could not load the plans.')} retry={() => { void plans.refetch(); }} />
        : <Card><CardContent>{plans.loading ? <div className="h-32 animate-pulse rounded-lg bg-muted" aria-busy="true" /> : <ul className="divide-y">{(plans.data ?? []).map((plan) => <li key={plan.plan} className="flex min-h-12 flex-wrap items-center justify-between gap-3 py-2">
          <span className="font-medium">{copy(plan.nameEn || plan.nameAr)}</span>
          <span className="text-sm tabular-nums text-muted-foreground">{plan.prices['1'] ? `${Number(plan.prices['1']).toLocaleString('en-US')} ${plan.currency}` : '—'} · {plan.active ? copy('On sale') : copy('Not on sale')}</span>
        </li>)}</ul>}</CardContent></Card>}
    </section>
  </div>;
}
