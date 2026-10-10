'use client';

import * as React from 'react';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import { AdsPageHeader } from './ads-page-header';
import { RecordCell } from './record-cell';
import { RecordList } from './record-list';
import { placeCover } from '@/lib/place-list';
import { SegmentedControl } from './segmented-control';
import { useDashboardCopy } from './dashboard-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUrlTab } from '@/lib/use-url-tab';
import { loadCampaignReports } from '@/lib/ads-data';
import { reportTotals } from '@/lib/ads-round5';
import { cairoDate } from '@/lib/api/subscribers';
import { shiftCalendarDays } from '@/lib/subscription-calendar';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { LoadingState, RequestError, useSubscriberText } from './subscriber-ui';

export function AdsResultsPage() {
  return <React.Suspense fallback={<LoadingState />}><ResultsContent /></React.Suspense>;
}

function ResultsContent() {
  const copy = useDashboardCopy();
  const { pick, lang } = useSubscriberText();
  const period = useUrlTab(['7d', '30d', 'month'], '7d', 'period');
  const group = useUrlTab(['campaign', 'surface', 'city'], 'campaign', 'by');
  const resource = useSubscriberResource(loadCampaignReports);
  const today = cairoDate();
  const from = period.value === 'month' ? `${today.slice(0, 7)}-01` : shiftCalendarDays(today, period.value === '30d' ? -29 : -6);
  const rows = (resource.data ?? []).map((report) => ({ report, ...reportTotals(report, from, today) }));
  const impressions = rows.reduce((total, row) => total + row.impressions, 0);
  const taps = rows.reduce((total, row) => total + row.taps, 0);
  const number = (value: number) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en').format(value);
  const rate = (shown: number, tapped: number) => shown ? new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en', { style: 'percent', maximumFractionDigits: 2 }).format(tapped / shown) : '—';
  const grouped = new Map<string, { name: string; shown: number; taps: number; href?: string; cover?: string | null; nameAr?: string; nameEn?: string | null }>();
  for (const row of rows) {
    if (group.value === 'city' && !row.report.campaign.city) continue;
    const campaign = row.report.campaign;
    const key = group.value === 'campaign' ? campaign.id : group.value === 'surface' ? campaign.placement : campaign.cityId!;
    const current = grouped.get(key) ?? { cover: group.value === 'campaign' ? placeCover(campaign.place) : null, nameAr: group.value === 'campaign' ? campaign.place.name : undefined, nameEn: group.value === 'campaign' ? campaign.place.nameEn : undefined, name: group.value === 'campaign' ? `${pick(campaign.place.name, campaign.place.nameEn)} · ${campaign.advertiserName}` : group.value === 'surface' ? copy(campaign.placement === 'featured' ? 'Home Featured rail' : 'City Top 10') : pick(campaign.city!.name, campaign.city!.nameEn), shown: 0, taps: 0, href: group.value === 'campaign' ? `/dashboard/ads/${campaign.id}/report` : undefined };
    current.shown += row.impressions;
    current.taps += row.taps;
    grouped.set(key, current);
  }
  return <div className="space-y-6">
    <AdsPageHeader title="Results" description="Shows and taps from campaign reports. City means the booked city, not the visitor’s city." actions={[{ label: 'Print / Save PDF', onClick: () => window.print(), readOnly: true, icon: <Printer className="size-4" aria-hidden="true" /> }]} />
    <SegmentedControl label="Report period" value={period.value} onValueChange={period.onValueChange} options={[{ value: '7d', label: 'Last 7 days' }, { value: '30d', label: 'Last 30 days' }, { value: 'month', label: 'This month' }]} />
    <p className="text-sm text-muted-foreground"><span dir="ltr">{from} – {today}</span> · {copy('Cairo · includes today')}</p>
    {resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load campaign reports.')} retry={() => { void resource.refetch(); }} /> : <>
      <div className="grid gap-4 sm:grid-cols-3">{[{ label: 'Shown', value: number(impressions), unit: 'shows · selected period' }, { label: 'Taps', value: number(taps), unit: 'taps · selected period' }, { label: 'Tap rate', value: rate(impressions, taps), unit: 'taps per show · selected period' }].map((metric) => <Card key={metric.label}><CardContent><p className="text-sm text-muted-foreground">{copy(metric.label)}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{metric.value}</p><p className="text-sm text-muted-foreground">{copy(metric.unit)}</p></CardContent></Card>)}</div>
      <Card><CardHeader><CardTitle>{copy('Campaign results')}</CardTitle><SegmentedControl label="Group results" value={group.value} onValueChange={group.onValueChange} options={[{ value: 'campaign', label: 'By campaign' }, { value: 'surface', label: 'By surface' }, { value: 'city', label: 'By booked city' }]} /></CardHeader><CardContent>
        {!grouped.size ? <p className="py-6 text-sm text-muted-foreground">{copy('No campaigns with data for this view.')}</p> : <div className="overflow-x-auto"><RecordList scope="results" records={Array.from(grouped.entries())} searchText={([, row]) => `${row.name} ${row.nameAr ?? ''} ${row.nameEn ?? ''}`} filters={[{ key: 'activity', label: 'All delivery', options: [{ value: 'shown', label: 'With shows' }, { value: 'unseen', label: 'Without shows' }], value: ([, row]) => row.shown ? 'shown' : 'unseen' }]} render={(visible) => <Table layout="list"><TableHeader><TableRow><TableHead>{copy(group.value === 'campaign' ? 'Campaign' : group.value === 'surface' ? 'Where it appears' : 'City')}</TableHead><TableHead className="text-end">{copy('Shown')}</TableHead><TableHead className="text-end">{copy('Taps')}</TableHead><TableHead className="text-end">{copy('Tap rate')}</TableHead></TableRow></TableHeader><TableBody>{visible.map(([key, row]) => <TableRow key={key}><TableCell className="whitespace-normal">{row.href ? <Link href={row.href} className="font-medium underline underline-offset-4"><RecordCell icon={group.value === "campaign" ? undefined : group.value === "city" ? "location" : "section"} name={row.nameAr ? undefined : row.name} nameAr={row.nameAr} nameEn={row.nameEn} thumbnail={row.cover ?? null} context={row.nameAr ? row.name : undefined} /></Link> : <RecordCell icon={group.value === "campaign" ? undefined : group.value === "city" ? "location" : "section"} name={row.nameAr ? undefined : row.name} nameAr={row.nameAr} nameEn={row.nameEn} thumbnail={row.cover ?? null} context={row.nameAr ? row.name : undefined} />}<p className="mt-1 text-xs text-muted-foreground tabular-nums sm:hidden">{number(row.shown)} {copy('Shown')} · {number(row.taps)} {copy('Taps')} · {rate(row.shown, row.taps)} {copy('Tap rate')}</p></TableCell><TableCell className="text-end tabular-nums">{number(row.shown)}</TableCell><TableCell className="text-end tabular-nums">{number(row.taps)}</TableCell><TableCell className="text-end tabular-nums">{rate(row.shown, row.taps)}</TableCell></TableRow>)}</TableBody></Table>} /></div>}
      </CardContent></Card>
    </>}
  </div>;
}
