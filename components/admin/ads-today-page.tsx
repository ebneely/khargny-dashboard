'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AdsPageHeader } from './ads-page-header';
import { RecordList } from './record-list';
import { RecordCell } from './record-cell';
import { placeCover } from '@/lib/place-list';
import type { AdCampaign } from '@/lib/api/ads';
import { useDashboardCopy } from './dashboard-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cairoDate } from '@/lib/api/subscribers';
import { loadTodayPromotionData } from '@/lib/ads-data';
import { reportTotals } from '@/lib/ads-round5';
import { shiftCalendarDays } from '@/lib/subscription-calendar';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { LoadingState, RequestError, useSubscriberText } from './subscriber-ui';

export function AdsTodayPage({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const today = cairoDate();
  const load = React.useCallback(() => loadTodayPromotionData(today), [today]);
  const resource = useSubscriberResource(load);
  const reports = resource.data?.reports ?? [];
  const campaigns = resource.data?.campaigns ?? [];
  const failedCampaigns = resource.data?.failedCampaigns ?? [];
  const live = campaigns.filter((campaign) => campaign.state === 'live');
  const counts = reports.map((report) => reportTotals(report, today, today));
  const number = (value: number) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en').format(value);
  const ending = campaigns.filter((campaign) => !['ended', 'expired'].includes(campaign.state) && campaign.endDate >= today && campaign.endDate <= shiftCalendarDays(today, 7));
  const lastTwo = [shiftCalendarDays(today, -2), shiftCalendarDays(today, -1)];
  const unseen = reports.filter((report) => report.campaign.state === 'live' && report.campaign.startDate <= lastTwo[0] && lastTwo.every((date) => report.days.some((day) => day.date === date && day.impressions === 0)));
  const free = resource.data?.capacity?.scopes.flatMap((scope) => scope.days.filter((day) => day.date === today && day.booked < day.capacity).map((day) => ({ scope, day }))) ?? [];
  return <div className="space-y-6">
    <AdsPageHeader title="Today" description="Promotion at a glance. Dates follow Cairo time." actions={[{ label: 'New campaign', href: '/dashboard/ads/new', allowed: canWrite, icon: <Plus className="size-4" aria-hidden="true" /> }]} />
    <p className="text-sm text-muted-foreground">{copy("Live paid campaigns only; editorial pins are listed in Always on.")}</p>
    {resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load promotion data.')} retry={() => { void resource.refetch(); }} /> : <>
      {failedCampaigns.length > 0 && <div role="status" className="space-y-3 rounded-md bg-muted p-4">
        <p className="text-sm">{copy('Some campaign reports could not be read. Shown and taps include readable reports only.')}</p>
        <CampaignAttention scope="failed-reports" title={copy('Unreadable reports')} campaigns={failedCampaigns} report />
        <Button variant="outline" onClick={() => { void resource.refetch(); }}>{copy('Retry')}</Button>
      </div>}
      <div className="grid gap-4 sm:grid-cols-3">{[
        { label: 'Promoted now', value: new Set(live.map((campaign) => campaign.placeId)).size, unit: 'places · now' },
        ...(reports.length || !campaigns.length ? [
          { label: 'Shown today', value: counts.reduce((total, count) => total + count.impressions, 0), unit: 'shows · today' },
          { label: 'Taps today', value: counts.reduce((total, count) => total + count.taps, 0), unit: 'taps · today' },
        ] : []),
      ].map((metric) => <Card key={metric.label}><CardContent><p className="text-sm text-muted-foreground">{copy(metric.label)}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{number(metric.value)}</p><p className="text-sm text-muted-foreground">{copy(metric.unit)}</p></CardContent></Card>)}</div>
      <Card><CardHeader><CardTitle>{copy('Needs you')}</CardTitle></CardHeader><CardContent className="space-y-5">
        <CampaignAttention scope="ending" title={copy('Ending within 7 days')} empty="No campaigns end within 7 days." campaigns={ending} />
        <CampaignAttention scope="unseen" title={copy('Not shown in the last 2 days')} empty="No confirmed gaps in the last 2 complete Cairo days." campaigns={unseen.map(({ campaign }) => campaign)} report />
        {resource.data?.capacity ? <section><h3 className="mb-3 font-semibold">{copy('Free capacity today')}</h3><RecordList scope="free-capacity" records={free} searchText={({ scope }) => `${scope.city?.name ?? ''} ${scope.city?.nameEn ?? ''} ${copy(scope.placement === 'featured' ? 'Home Featured rail' : 'City Top 10')}`} filters={[{ key: 'placement', label: 'All surfaces', options: [{ value: 'featured', label: 'Home Featured rail' }, { value: 'top10', label: 'City Top 10' }], value: ({ scope }) => scope.placement }]} empty="No free capacity is reported today." render={(rows) => <ul className="divide-y">{rows.map(({ scope, day }) => <li key={`${scope.placement}-${scope.cityId}`} className="space-y-2 py-3"><Link className="underline underline-offset-4" href={`/dashboard/ads/campaigns?placement=${scope.placement}${scope.cityId ? `&cityId=${scope.cityId}` : ''}`}><RecordCell icon="location" name={scope.city ? undefined : copy('All Egypt')} nameAr={scope.city?.name} nameEn={scope.city?.nameEn} thumbnail={null} context={copy(scope.placement === 'featured' ? 'Home Featured rail' : 'City Top 10')} /></Link><p className="text-sm tabular-nums">{number(day.capacity - day.booked)} {copy('free places · today')}</p></li>)}</ul>} /></section> : <RequestError message={copy('Could not load free capacity.')} retry={() => { void resource.refetch(); }} />}
      </CardContent></Card>
    </>}
    <Card><CardHeader><CardTitle>{copy('How promotion works on 5argny')}</CardTitle></CardHeader><CardContent><ol className="grid gap-5 sm:grid-cols-2">{['Choose where visitors will see the place.', 'Choose an active place and book its dates.', 'The place shares the available space with other booked places.', 'Read its report to see shows, taps and tap rate.'].map((step, index) => <li key={step} className="flex gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted tabular-nums">{number(index + 1)}</span><p className="text-sm">{copy(step)}</p></li>)}</ol></CardContent></Card>
  </div>;
}

function CampaignAttention({ scope, title, empty, campaigns, report }: { scope: string; title: string; empty?: string; campaigns: AdCampaign[]; report?: boolean }) {
  const copy = useDashboardCopy();
  return <section><h3 className="mb-3 font-semibold">{title}</h3><RecordList scope={scope} records={campaigns} empty={empty} searchText={(campaign) => `${campaign.place.name} ${campaign.place.nameEn ?? ''} ${campaign.advertiserName} ${campaign.city?.name ?? ''} ${campaign.city?.nameEn ?? ''}`} filters={[{ key: 'placement', label: 'All surfaces', options: [{ value: 'featured', label: 'Home Featured rail' }, { value: 'top10', label: 'City Top 10' }], value: (campaign) => campaign.placement }]} render={(rows) => <ul className="divide-y">{rows.map((campaign) => <li key={campaign.id} className="py-3"><Link className="inline-block underline underline-offset-4" href={`/dashboard/ads/${campaign.id}${report ? '/report' : ''}`}><RecordCell nameAr={campaign.place.name} nameEn={campaign.place.nameEn} thumbnail={placeCover(campaign.place)} context={scope === 'unseen' ? `${campaign.advertiserName} · 0 ${copy('shows · last 2 days')}` : `${campaign.advertiserName} · ${copy('Ends on')} ${campaign.endDate}`} /></Link></li>)}</ul>} /></section>;
}
