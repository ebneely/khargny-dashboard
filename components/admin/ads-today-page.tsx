'use client';

import * as React from 'react';
import { Eye, CalendarDays } from 'lucide-react';
import { AdsPageHeader } from './ads-page-header';
import { AdsOpportunities } from './ads-opportunities';
import { RecordList } from './record-list';
import { RecordCell } from './record-cell';
import { RowActions } from './row-actions';
import { DateCell } from './date-cell';
import { useDashboardCopy } from './dashboard-text';
import { LoadingState, RequestError } from './subscriber-ui';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { adminApi, toList } from '@/lib/api/admin-client';
import { adsBApi, type AdsSummary, type PromotionCampaign } from '@/lib/api/ads-round-b';
import type { PromotionReport } from '@/lib/api/promotion-report';
import { campaignHref, hasFreeSpace } from '@/lib/ads-round7b';
import { cairoDate } from '@/lib/api/subscribers';
import { shiftCalendarDays } from '@/lib/subscription-calendar';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { placeCover } from '@/lib/place-list';

export function AdsTodayPage({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy(); const { lang } = useDashboardLang(); const today = cairoDate();
  const load = React.useCallback(async () => {
    const [surfaces, campaigns, promotions, money, results] = await Promise.all([adsBApi.surfaces(today, shiftCalendarDays(today, 6)), adminApi.get('/v1/admin/ads/campaigns'), adminApi.get<PromotionReport>('/v1/admin/promotions', { from: today, to: today }), adminApi.get<AdsSummary>('/v1/admin/ads/summary', { from: `${today.slice(0, 7)}-01`, to: today }), adsBApi.results(today, today, 'source')]);
    return { surfaces, campaigns: toList<PromotionCampaign>(campaigns).items, promotions, money, results };
  }, [today]);
  const resource = useSubscriberResource(load); const campaigns = resource.data?.campaigns ?? [];
  const ending = campaigns.filter(row => row.kind !== 'always_on' && row.endDate && row.endDate >= today && row.endDate <= shiftCalendarDays(today, 6) && !['ended', 'expired'].includes(row.state));
  const noExposure = campaigns.filter(row => Number(row.amountPaid) > 0 && row.state === 'live' && row.totals.impressions === 0);
  const free = (resource.data?.surfaces.data ?? []).filter(hasFreeSpace); const results = resource.data?.results.data ?? [];
  return <div className="min-w-0 space-y-6"><AdsPageHeader title="Today" description="Decisions first: expiring agreements, exposure to check and space worth selling." actions={[{ label: 'New campaign', href: '/dashboard/ads/new', allowed: canWrite }]} />
    {resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load promotion data.')} retry={() => { void resource.refetch(); }} /> : <>
      <Card><CardHeader><CardTitle>{copy('Needs you')}</CardTitle></CardHeader><CardContent className="space-y-6"><CampaignAttention title="Ending within 7 days" scope="ending" campaigns={ending} /><CampaignAttention title="Paid agreements with no recorded shows" scope="unseen" campaigns={noExposure} /><p className="text-sm text-muted-foreground">{copy('No recorded exposure is a reason to investigate, not proof of no delivery. Missing and padded counters do not establish complete ingestion.')}</p><h3 className="font-semibold">{copy('Free slots worth selling')}</h3><RecordList scope="free-slots" records={free} searchText={row => row.name} render={visible => <div>{visible.map(surface => <div key={surface.key} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-2"><RecordCell icon="section" name={surface.name} context={`${today} — ${shiftCalendarDays(today, 6)}`} /><p className="ms-auto text-sm tabular-nums">{Math.max(...(surface.days ?? []).map(day => day.free))} {copy('maximum free positions in the next 7 days')}</p>{canWrite && <RowActions recordName={surface.name} actions={[{ label: 'Start a campaign here', icon: <CalendarDays />, href: campaignHref(surface) }]} />}</div>)}</div>} /></CardContent></Card>
      <div className="grid gap-4 sm:grid-cols-3"><TodayNumber label="Eligible promoted places today" value={new Set(resource.data?.promotions.data.filter(row => row.promotedToday).map(row => row.place.id)).size} /><TodayNumber label="Shown today" value={results.reduce((sum, row) => sum + row.shown, 0)} /><TodayNumber label="Taps today" value={results.reduce((sum, row) => sum + row.taps, 0)} /></div>
      <Card><CardHeader><CardTitle>{copy('Recorded agreements this month')}</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{copy('Agreement amounts recorded this Cairo month, not cash received. Currencies are never added together.')} {resource.data?.money.from} — {resource.data?.money.to}</p><RecordList scope="booked-money" records={resource.data?.money.currencies ?? []} searchText={row => row.currency} render={visible => <div>{visible.map(row => <div key={row.currency} className="flex min-h-14 items-center gap-3 border-b py-2"><RecordCell icon="receipt" name={row.currency} context={`${row.bookedCount.toLocaleString(lang)} ${copy('recorded agreements')}`} /><span className="ms-auto tabular-nums">{Number(row.bookedAmount).toLocaleString(lang, { maximumFractionDigits: 2 })} {row.currency}</span></div>)}</div>} /></CardContent></Card>
      <Card><CardHeader><CardTitle>{copy('Opportunities')}</CardTitle></CardHeader><CardContent><AdsOpportunities surfaces={resource.data?.surfaces.data ?? []} canWrite={canWrite} /></CardContent></Card>
      <Card><CardHeader><CardTitle>{copy('How promotion works on 5argny')}</CardTitle></CardHeader><CardContent><p className="text-sm">{copy('Choose a surface, choose an eligible place, agree the dates and amount, then compare what visitors did. Paid places are Sponsored; shuffle tests do not change earned ranking, loves or badges.')}</p></CardContent></Card>
    </>}
  </div>;
}
function TodayNumber({ label, value }: { label: string; value: number }) { const copy = useDashboardCopy(); const { lang } = useDashboardLang(); return <Card><CardHeader><CardTitle>{copy(label)}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{value.toLocaleString(lang)}</p><p className="text-sm text-muted-foreground">{copy('Today · Cairo time')}</p></CardContent></Card>; }
function CampaignAttention({ title, scope, campaigns }: { title: string; scope: string; campaigns: PromotionCampaign[] }) {
  const copy = useDashboardCopy(); return <section className="space-y-3"><h3 className="font-semibold">{copy(title)}</h3><RecordList scope={scope} records={campaigns} searchText={row => `${row.place.name} ${row.place.nameEn ?? ''} ${row.advertiserName}`} render={visible => <div>{visible.map(row => <div key={row.id} className="flex min-h-14 flex-wrap items-center gap-3 border-b py-2"><RecordCell nameAr={row.place.name} nameEn={row.place.nameEn} thumbnail={placeCover(row.place)} context={row.advertiserName} /><p className="ms-auto text-sm">{row.endDate && <DateCell value={row.endDate} />}</p><RowActions recordName={row.place.name} actions={[{ label: 'View report', href: `/dashboard/ads/${row.id}/report`, icon: <Eye /> }]} /></div>)}</div>} /></section>;
}
