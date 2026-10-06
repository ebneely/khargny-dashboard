'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Loader2, Printer } from 'lucide-react';
import { AdsPageHeader } from '@/components/admin/ads-page-header';
import { AdStateBadge } from '@/components/admin/ad-state-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/lib/api/admin-client';
import {
  displayName,
  formatCount,
  formatCtr,
  formatDate,
  type AdCampaignReport,
  type AdReportDay,
} from '@/lib/api/ads';

export function AdReportPage({ campaignId }: { campaignId: string }) {
  const [report, setReport] = React.useState<AdCampaignReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await adminApi.get<AdCampaignReport>(`/v1/admin/ads/campaigns/${campaignId}/report`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load this report.');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />Loading report…</div>;
  }

  if (!report) {
    return (
      <Card><CardContent className="py-12 text-center">
        <p className="mb-3 text-sm text-destructive" role="alert">{error ?? 'Report not found.'}</p>
        <Button data-ro-allow="true" variant="outline" onClick={() => void load()}>Retry</Button>
      </CardContent></Card>
    );
  }

  const { campaign, totals, days, methodology } = report;
  const placeName = displayName(campaign.place.name, campaign.place.nameEn);

  return (
    <div className="ad-report">
      {/* The dashboard chrome (logo, sidebar) is hidden in print, so the one-pager carries
          its own masthead for the advertiser. */}
      <p className="mb-4 hidden border-b pb-2 text-sm font-semibold print:block">
        Khargny · خرجني — Sponsored placement report
      </p>
      <AdsPageHeader
        title={`${placeName} campaign report`}
        description={`Prepared for ${campaign.advertiserName}. Generated ${new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: report.timezone }).format(new Date(report.generatedAt))} (${report.timezone}).`}
        actions={
          <>
            <Button render={<Link href={`/dashboard/ads/${campaignId}`} />} variant="outline"><ArrowLeft className="size-4" />Campaign</Button>
            <Button data-ro-allow="true" onClick={() => window.print()}><Printer className="size-4" />Print / Save PDF</Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y bg-card px-4 py-3 text-sm">
        <AdStateBadge state={campaign.state} />
        <span><strong>Placement:</strong> {campaign.placement === 'featured' ? 'Featured' : 'Top 10'}</span>
        <span><strong>Scope:</strong> {campaign.city ? displayName(campaign.city.name, campaign.city.nameEn) : 'All Egypt'}</span>
        <span><strong>Dates:</strong> {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}</span>
        <span><strong>Timezone:</strong> {report.timezone}</span>
      </div>

      <section className="mb-5 grid grid-cols-2 divide-x divide-y overflow-hidden rounded-(--radius-ds-lg) bg-card shadow-(--shadow-ds-sm) md:grid-cols-4 md:divide-y-0" aria-label="Campaign totals">
        <ReportMetric label="Impressions" value={formatCount(totals.impressions)} />
        <ReportMetric label="Taps" value={formatCount(totals.taps)} />
        <ReportMetric label="CTR" value={formatCtr(totals.ctr)} />
        <ReportMetric label="Reach" value={formatCount(totals.reach)} />
      </section>

      <Card className="ad-report-chart mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" />Daily performance</CardTitle>
        </CardHeader>
        <CardContent>
          {days.length > 0 ? <DailyBarChart days={days} /> : (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              Daily performance begins when the scheduled campaign starts.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardHeader><CardTitle>Daily detail</CardTitle></CardHeader>
        <CardContent>
          {days.length > 0 ? (
            <Table className="min-w-[680px]">
              <TableHeader><TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">Taps</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Reach</TableHead>
              </TableRow></TableHeader>
              <TableBody>{days.map((day) => (
                <TableRow key={day.date}>
                  <TableCell>{formatDate(day.date)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(day.impressions)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(day.taps)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCtr(day.ctr)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(day.reach)}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">No daily rows yet.</p>}
        </CardContent>
      </Card>

      <section className="rounded-(--radius-ds-lg) border bg-info-bg p-5 text-info" aria-labelledby="methodology-heading">
        <h2 id="methodology-heading" className="font-heading font-semibold">How these numbers are measured</h2>
        <dl className="mt-3 grid gap-3 text-sm md:grid-cols-3">
          <Method label="Impression" value={methodology.impression} />
          <Method label="Tap" value={methodology.tap} />
          <Method label="Reach" value={methodology.reach} />
        </dl>
      </section>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-5 md:px-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Method({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-medium">{label}</dt><dd className="mt-1 leading-relaxed opacity-90">{value}</dd></div>;
}

function DailyBarChart({ days }: { days: AdReportDay[] }) {
  const width = Math.max(680, days.length * 34 + 64);
  const height = 250;
  const left = 48;
  const top = 18;
  const bottom = 38;
  const chartHeight = height - top - bottom;
  const chartWidth = width - left - 44;
  const maxValue = Math.max(1, ...days.map((day) => day.impressions));
  // Taps are typically 1–5% of impressions: on the impressions scale they would be an
  // invisible sliver, so they get their own scale (right axis) and are drawn as a line.
  const maxTaps = Math.max(1, ...days.map((day) => day.taps));
  const groupWidth = chartWidth / days.length;
  const tapPoints = days.map((day, index) => ({
    x: left + groupWidth * index + groupWidth / 2,
    y: top + chartHeight - (day.taps / maxTaps) * chartHeight,
  }));
  const barWidth = Math.min(18, Math.max(5, groupWidth * 0.55));

  return (
    <div className="overflow-x-auto">
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />Impressions</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-info" />Taps (right axis)</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-labelledby="daily-chart-title daily-chart-desc" className="max-w-none print:w-full">
        <title id="daily-chart-title">Daily impressions and taps</title>
        <desc id="daily-chart-desc">Bar chart from {days[0]?.date} through {days.at(-1)?.date}.</desc>
        {[0, 0.5, 1].map((ratio) => {
          const y = top + chartHeight * (1 - ratio);
          return (
            <g key={ratio}>
              <line x1={left} x2={left + chartWidth} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x={left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{formatCount(Math.round(maxValue * ratio))}</text>
              <text x={left + chartWidth + 8} y={y + 4} textAnchor="start" fontSize="10" fill="var(--info)">{formatCount(Math.round(maxTaps * ratio))}</text>
            </g>
          );
        })}
        {days.map((day, index) => {
          const center = left + groupWidth * index + groupWidth / 2;
          const impressionHeight = (day.impressions / maxValue) * chartHeight;

          const showLabel = days.length <= 20 || index % Math.ceil(days.length / 12) === 0 || index === days.length - 1;
          return (
            <g key={day.date}>
              <rect x={center - barWidth / 2} y={top + chartHeight - impressionHeight} width={barWidth} height={impressionHeight} rx="2" fill="var(--primary)" />
              <circle cx={center} cy={tapPoints[index].y} r="3" fill="var(--info)" />
              {showLabel && <text x={center} y={height - 13} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">{day.date.slice(5)}</text>}
              <title>{day.date}: {formatCount(day.impressions)} impressions, {formatCount(day.taps)} taps</title>
            </g>
          );
        })}
        <polyline
          points={tapPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="var(--info)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
