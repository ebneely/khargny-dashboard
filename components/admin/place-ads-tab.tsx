'use client';

import * as React from 'react';
import Link from 'next/link';
import type { AdCampaignReport } from '@/lib/api/ads';
import type { PlacePromotion } from '@/lib/place-public-state';
import { loadCampaignReports } from '@/lib/ads-data';
import { reportTotals } from '@/lib/ads-round5';
import { cairoDate } from '@/lib/api/subscribers';
import { shiftCalendarDays } from '@/lib/subscription-calendar';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useDashboardCopy } from './dashboard-text';
import { PageActions } from './page-actions';
import { RecordCell } from './record-cell';
import { RecordList } from './record-list';
import { placeCover } from '@/lib/place-list';
import { DateCell, DateRange } from './date-cell';
import { AdStateBadge } from './ad-state-badge';
import { StatusBadge, RequestError, LoadingState } from './subscriber-ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

export function PlaceAdsTab({ placeId, canWrite, promotions }: { placeId: string; canWrite: boolean; promotions?: PlacePromotion[] }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const [reports, setReports] = React.useState<AdCampaignReport[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true); setError('');
      loadCampaignReports({ placeId }).then((result) => { if (active) setReports(result); })
        .catch(() => { if (active) setError(copy('Could not load this place’s campaigns. Try again.')); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [placeId, copy, retry]);
  const to = cairoDate();
  const from = shiftCalendarDays(to, -29);
  const current = reports.filter((report) => !['ended', 'expired'].includes(report.campaign.state));
  const past = reports.filter((report) => ['ended', 'expired'].includes(report.campaign.state));
  const table = (items: AdCampaignReport[], scope: string) => <RecordList scope={scope} records={items} searchText={({ campaign }) => `${campaign.advertiserName} ${campaign.place.name} ${campaign.place.nameEn ?? ''}`} filters={[{ key: 'placement', label: 'All surfaces', options: [{ value: 'featured', label: 'Home Featured rail' }, { value: 'top10', label: 'City Top 10' }], value: ({ campaign }) => campaign.placement }]} render={(visible) => <Table layout="list"><TableHeader><TableRow><TableHead>{copy('Campaign')}</TableHead><TableHead>{copy('Dates')}</TableHead><TableHead>{copy('Shown in the last 30 days')}</TableHead><TableHead>{copy('Taps in the last 30 days')}</TableHead><TableHead column="status">{copy('Status')}</TableHead></TableRow></TableHeader><TableBody>{visible.map((report) => {
    const campaign = report.campaign;
    const totals = reportTotals(report, from, to);
    const surface = copy(campaign.placement === 'featured' ? 'Home Featured rail' : 'City Top 10');
    return <TableRow key={campaign.id}><TableCell><Link data-ro-allow="true" href={'/dashboard/ads/' + campaign.id + '/report'} className="block min-w-0 rounded focus-visible:outline-ring"><RecordCell nameAr={campaign.place.name} nameEn={campaign.place.nameEn} thumbnail={placeCover(campaign.place)} context={campaign.advertiserName} /><p className="text-xs text-muted-foreground">{surface} · {campaign.city ? (lang === 'ar' ? campaign.city.name : campaign.city.nameEn || campaign.city.name) : campaign.cityId ? copy('City scope') : copy('All Egypt')}</p><p className="text-xs text-muted-foreground sm:hidden">{totals.impressions.toLocaleString(lang)} {copy('shown')} · {totals.taps.toLocaleString(lang)} {copy('taps')} · {copy('Last 30 days')}</p></Link></TableCell><TableCell><DateRange start={campaign.startDate} end={campaign.endDate} /></TableCell><TableCell className="tabular-nums">{totals.impressions.toLocaleString(lang)}</TableCell><TableCell className="tabular-nums">{totals.taps.toLocaleString(lang)}</TableCell><TableCell column="status"><AdStateBadge state={campaign.state} /></TableCell></TableRow>;
  })}</TableBody></Table>} />;
  return <section className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{copy('Ads for this place')}</h2><PageActions actions={[{ label: 'Promote this place', href: '/dashboard/ads/new?placeId=' + encodeURIComponent(placeId), allowed: canWrite }]} /></header>
    {loading ? <LoadingState /> : error ? <RequestError message={error} retry={() => setRetry((value) => value + 1)} /> : <>
      {!reports.some((report) => report.campaign.state === 'live') && !promotions?.some((promotion) => promotion.state === 'live') && <p className="text-sm text-muted-foreground">{copy(promotions !== undefined ? 'Not promoted anywhere.' : 'Not promoted by a campaign.')}</p>}
      {!!current.length && <section className="space-y-3"><h3 className="font-semibold">{copy('Current campaigns')}</h3>{table(current, 'current-campaigns')}</section>}
      {!!past.length && <section className="space-y-3"><h3 className="font-semibold">{copy('Past campaigns')}</h3>{table(past, 'past-campaigns')}</section>}
      {!!reports.length && <p className="text-sm text-muted-foreground">{copy('Shown and taps cover the last 30 days.')} <DateRange start={from} end={to} /></p>}
    </>}
    {!!promotions?.length && <section className="space-y-3"><h3 className="font-semibold">{copy('Other promotions')}</h3><RecordList scope="other-promotions" records={promotions} searchText={(promotion) => `${promotion.source} ${promotion.surface} ${promotion.state}`} filters={[{ key: 'source', label: 'All promotion sources', options: [{ value: 'plan', label: 'From a plan' }, { value: 'manual', label: 'By hand' }], value: (promotion) => promotion.source }]} render={(visible) => <ul>{visible.map((promotion) => <li key={promotion.id} className="flex min-h-14 min-w-0 flex-wrap items-center gap-3 border-b border-border py-2"><div className="min-w-0 flex-1"><RecordCell icon="section" name={copy(promotion.surface)} thumbnail={reports[0] ? placeCover(reports[0].campaign.place) : null} context={copy(promotion.source === 'plan' ? 'From a plan' : 'By hand')} />{promotion.startDate && (promotion.endDate ? <DateRange start={promotion.startDate} end={promotion.endDate} /> : <p className="text-sm text-muted-foreground">{copy('Since')} <DateCell value={promotion.startDate} /></p>)}{promotion.impressions !== undefined && promotion.metricsFrom && promotion.metricsTo && <p className="text-sm text-muted-foreground">{promotion.impressions.toLocaleString(lang)} {copy('shown')}{promotion.taps !== undefined && <> · {promotion.taps.toLocaleString(lang)} {copy('taps')}</>} · <DateRange start={promotion.metricsFrom} end={promotion.metricsTo} /></p>}</div><StatusBadge status={promotion.state} /></li>)}</ul>} /></section>}
  </section>;
}
