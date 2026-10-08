'use client';

import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Printer } from 'lucide-react';
import { ContentSkeleton } from '@/components/admin/content-skeleton';
import { AdsPageHeader } from '@/components/admin/ads-page-header';
import { AdStateBadge } from '@/components/admin/ad-state-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminApi } from '@/lib/api/admin-client';
import { useDashboardLang } from '@/lib/dashboard-lang';
import {
  formatCount,
  formatCtr,
  formatDate,
  type AdCampaignReport,
  type AdReportDay,
} from '@/lib/api/ads';

export function AdReportPage({ campaignId }: { campaignId: string }) {
  const controlCopy = useDashboardCopy();
  const { lang, pick } = useDashboardLang();
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
    return <ContentSkeleton />;
  }

  if (!report) {
    return (
      <Card><CardContent className="py-12 text-center">
        <p className="mb-3 text-sm text-destructive" role="alert"><DashboardText>{error ?? 'Report not found.'}</DashboardText></p>
        <Button data-ro-allow="true" variant="outline" onClick={() => void load()}><DashboardText>Retry</DashboardText></Button>
      </CardContent></Card>
    );
  }

  const { campaign, totals, days, methodology } = report;
  const placeName = pick(campaign.place.name, campaign.place.nameEn) || '—';
  const generatedAt = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: report.timezone }).format(new Date(report.generatedAt));

  return (
    <div className="ad-report">
      {/* The dashboard chrome (logo, sidebar) is hidden in print, so the one-pager carries
          its own masthead for the advertiser. */}
      <p className="mb-4 hidden border-b pb-2 text-sm font-semibold print:block">
        <DashboardText>Khargny · خرجني — Sponsored placement report</DashboardText>
      </p>
      <AdsPageHeader
        title={lang === 'ar' ? `تقرير حملة ${placeName}` : `${placeName} campaign report`}
        description={lang === 'ar' ? `أُعد لصالح ${campaign.advertiserName}. تاريخ الإنشاء ${generatedAt} (${report.timezone}).` : `Prepared for ${campaign.advertiserName}. Generated ${generatedAt} (${report.timezone}).`}
        actions={
          <>
            <Button render={<Link href={`/dashboard/ads/${campaignId}`} />} variant="outline"><ArrowLeft className="size-4" /><DashboardText>Campaign</DashboardText></Button>
            <Button data-ro-allow="true" onClick={() => window.print()}><Printer className="size-4" /><DashboardText>Print / Save PDF</DashboardText></Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y bg-card px-4 py-3 text-sm">
        <AdStateBadge state={campaign.state} />
        <span><strong><DashboardText>Placement:</DashboardText></strong> <DashboardText>{campaign.placement === 'featured' ? 'Featured' : 'Top 10'}</DashboardText></span>
        <span><strong><DashboardText>Scope:</DashboardText></strong> {campaign.city ? pick(campaign.city.name, campaign.city.nameEn) : <DashboardText>All Egypt</DashboardText>}</span>
        <span><strong><DashboardText>Dates:</DashboardText></strong> {formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}</span>
        <span><strong><DashboardText>Timezone:</DashboardText></strong> {report.timezone}</span>
      </div>

      <section className="mb-5 grid grid-cols-2 divide-x divide-y overflow-hidden rounded-(--radius-ds-lg) bg-card shadow-(--shadow-ds-sm) md:grid-cols-4 md:divide-y-0" aria-label={controlCopy("Campaign totals")}>
        <ReportMetric label="Impressions" value={formatCount(totals.impressions)} />
        <ReportMetric label="Taps" value={formatCount(totals.taps)} />
        <ReportMetric label="CTR" value={formatCtr(totals.ctr)} />
        <ReportMetric label="Reach" value={formatCount(totals.reach)} />
      </section>

      <Card className="ad-report-chart mb-5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /><DashboardText>Daily performance</DashboardText></CardTitle>
        </CardHeader>
        <CardContent>
          {days.length > 0 ? <DailyBarChart days={days} /> : (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              <DashboardText>Daily performance begins when the scheduled campaign starts.</DashboardText>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardHeader><CardTitle><DashboardText>Daily detail</DashboardText></CardTitle></CardHeader>
        <CardContent>
          {days.length > 0 ? (
            <Table className="min-w-[680px]">
              <TableHeader><TableRow>
                <TableHead><DashboardText>Date</DashboardText></TableHead>
                <TableHead className="text-right"><DashboardText>Impressions</DashboardText></TableHead>
                <TableHead className="text-right"><DashboardText>Taps</DashboardText></TableHead>
                <TableHead className="text-right"><DashboardText>CTR</DashboardText></TableHead>
                <TableHead className="text-right"><DashboardText>Reach</DashboardText></TableHead>
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
          ) : <p className="py-8 text-center text-sm text-muted-foreground"><DashboardText>No daily rows yet.</DashboardText></p>}
        </CardContent>
      </Card>

      <section className="rounded-(--radius-ds-lg) border bg-info-bg p-5 text-info" aria-labelledby="methodology-heading">
        <h2 id="methodology-heading" className="font-heading font-semibold"><DashboardText>How these numbers are measured</DashboardText></h2>
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
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" /><DashboardText>Impressions</DashboardText></span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded-full bg-info" /><DashboardText>Taps (right axis)</DashboardText></span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-labelledby="daily-chart-title daily-chart-desc" className="max-w-none print:w-full">
        <title id="daily-chart-title"><DashboardText>Daily impressions and taps</DashboardText></title>
        <desc id="daily-chart-desc"><DashboardText>Bar chart from</DashboardText> {days[0]?.date} <DashboardText>through</DashboardText> {days.at(-1)?.date}.</desc>
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
              <title>{day.date}: {formatCount(day.impressions)} <DashboardText>impressions,</DashboardText> {formatCount(day.taps)} <DashboardText>taps</DashboardText></title>
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
