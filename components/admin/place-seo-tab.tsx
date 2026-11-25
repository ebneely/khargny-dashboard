'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { dashboardDateTime } from '@/lib/dashboard-date';
import { localeFor } from '@/lib/locale';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { SegmentedControl } from './segmented-control';
import { useDashboardCopy } from './dashboard-text';

type Status = 'pass' | 'warn' | 'fail';
type Locale = 'en' | 'ar';

interface Totals {
  impressions: number;
  clicks: number;
  position: number | null;
  ctr: number | null;
}
interface QueryRow {
  query: string;
  impressions: number;
  clicks: number;
  position: number;
  locale?: Locale;
}
interface Group {
  impressions: number;
  clicks: number;
  position: number | null;
  top: QueryRow[];
}
interface IndexRow {
  verdict: string;
  coverageState: string | null;
  lastCrawl: string | null;
  googleCanonical: string | null;
  checkedAt: string | null;
}
interface Meta {
  title: string;
  titleLength: number;
  description: string;
  descriptionLength: number;
  canonical: string | null;
  hreflang: string[];
  robots: string | null;
  h1: string | null;
  schemaTypes: string[];
  wordCount: number;
  imageCount: number;
}
interface Check {
  id: string;
  status: Status;
  value: string;
  hintEn: string;
  hintAr: string;
}
interface PlaceSeo {
  place: {
    id: string;
    name: string;
    nameEn: string | null;
    slug: string;
    citySlug: string;
    status: string;
    urls: Record<Locale, string>;
  };
  window: number;
  totals: Record<Locale, Totals> & { all: Totals };
  groups: Record<Locale, Record<'name_brand' | 'name_intent' | 'name' | 'other', Group>>;
  queries: QueryRow[];
  trend: { week: string; impressions: number; clicks: number }[];
  index: Record<Locale, IndexRow | null>;
  metadata: Record<Locale, Meta | null>;
  health: { score: number; checks: Check[] };
}

const WINDOWS = [
  { value: '28', label: 'Last 28 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '480', label: '16 months' },
];
const GROUPS = [
  ['name', 'Name'],
  ['name_brand', 'Name + 5argny · Khargny · خرجني'],
  ['name_intent', 'Name + menu · prices · hours · location · number · phone · reviews · booking'],
  ['other', 'Other'],
] as const;
const CHECK_LABELS: Record<string, string> = {
  'indexed:en': 'Indexing',
  'indexed:ar': 'Indexing',
  'canonical:en': 'Canonical',
  'canonical:ar': 'Canonical',
  'title:en': 'Title length',
  'title:ar': 'Title length',
  'description:en': 'Description length',
  'description:ar': 'Description length',
  'words:en': 'Words',
  'words:ar': 'Words',
  'name_position:en': 'Name search',
  'name_position:ar': 'Name search',
  hreflang: 'Hreflang',
  photos: 'Photos',
  hours: 'Hours',
  phone: 'Phone',
  names: 'Both names',
  features: 'Features',
  schema: 'Schema type',
  ctr: 'Click rate vs expected',
};
const GROUP_LABELS = Object.fromEntries(GROUPS) as Record<string, string>;

function StatusIcon({ status }: { status: Status }) {
  if (status === 'pass')
    return <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden="true" />;
  if (status === 'warn')
    return <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />;
  return <XCircle className="size-4 shrink-0 text-destructive" aria-hidden="true" />;
}

const statusWord = (status: Status) =>
  status === 'pass' ? 'Pass' : status === 'warn' ? 'Warn' : 'Fail';

const scoreStatus = (score: number): Status =>
  score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

const displayPosition = (position: number | null) =>
  position === null ? '—' : position.toFixed(1);

/** Place > SEO: Google positions, indexing, the page as Google sees it and the fixes. */
export function PlaceSeoTab({ placeId }: { placeId: string }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const [days, setDays] = React.useState('28');
  const [busy, setBusy] = React.useState(false);
  const load = React.useCallback(
    () =>
      adminApi.get<PlaceSeo>(
        `/v1/admin/places/${encodeURIComponent(placeId)}/seo`,
        { days },
      ),
    [placeId, days],
  );
  const resource = useSubscriberResource(load);
  const data = resource.data;
  const n = (value: number | null | undefined) =>
    value === null || value === undefined
      ? '—'
      : value.toLocaleString(localeFor(lang));
  const hint = (check: Check) => (lang === 'ar' ? check.hintAr : check.hintEn);
  const label = (id: string) => {
    const base = copy(CHECK_LABELS[id] ?? id);
    const locale = id.endsWith(':en')
      ? copy('English')
      : id.endsWith(':ar')
        ? copy('Arabic')
        : '';
    return locale ? `${base} · ${locale}` : base;
  };
  const checkCount = (status: Status) =>
    data?.health.checks.filter((check) => check.status === status).length ?? 0;

  const inspect = async () => {
    setBusy(true);
    try {
      await adminApi.post(`/v1/admin/places/${encodeURIComponent(placeId)}/seo/inspect`);
      toast.success(copy('Google checked both pages.'));
      await resource.refetch();
    } catch (error) {
      const status = error instanceof AdminApiError ? error.status : 0;
      toast.error(
        copy(
          status === 429
            ? 'The daily Google inspection budget is spent. Try again after midnight Cairo time.'
            : status === 503
              ? 'Google is not connected on this server.'
              : 'Could not check now. Try again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  if (resource.loading && !data)
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  if (resource.error || !data)
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">
            {copy('Could not load the SEO details.')}
          </p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => void resource.refetch()}
          >
            {copy('Retry')}
          </Button>
        </CardContent>
      </Card>
    );

  const score = data.health.score;
  const status = scoreStatus(score);
  const maxTrend = Math.max(1, ...data.trend.map((point) => point.impressions));
  const publicBase = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.5argny.com';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Window"
          value={days}
          onValueChange={(value) => setDays(value)}
          options={WINDOWS}
        />
        <p className="text-sm text-muted-foreground">
          {copy('What Google sees, where it ranks and what to fix.')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4 text-primary" aria-hidden="true" />
            {copy('SEO score')}
          </CardTitle>
          <CardDescription>
            {copy('Each line says what Google sees and what to do.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-baseline gap-2">
              <StatusIcon status={status} />
              <span className="text-4xl font-semibold tabular-nums tracking-tight">
                {n(score)}
              </span>
              <span className="text-sm text-muted-foreground">
                {copy('out of 100')}
              </span>
            </span>
            <span className="flex flex-wrap items-center gap-3 text-sm">
              {(['pass', 'warn', 'fail'] as Status[]).map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <StatusIcon status={item} />
                  <span className="text-muted-foreground">{copy(statusWord(item))}</span>
                  <span className="font-medium tabular-nums">{n(checkCount(item))}</span>
                </span>
              ))}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
            <div
              className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-[550ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none rtl:origin-right"
              style={{ transform: `scaleX(${score / 100})` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy('Health checks')}</CardTitle>
          <CardDescription>
            {copy('Each line says what Google sees and what to do.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {data.health.checks.map((check) => (
              <li
                key={check.id}
                className="flex min-h-12 flex-wrap items-start gap-x-3 gap-y-1 py-3"
              >
                <StatusIcon status={check.status} />
                <span className="w-44 shrink-0 text-sm font-medium">{label(check.id)}</span>
                <span className="w-24 shrink-0 text-sm tabular-nums text-muted-foreground">
                  {check.value}
                </span>
                <span className="min-w-0 flex-1 basis-56 text-sm">{hint(check)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy('Google positions')}</CardTitle>
          <CardDescription>
            {copy('A query nobody searched shows —. Google only reports searches real people made.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy('Search')}</TableHead>
                <TableHead>{copy('English')}</TableHead>
                <TableHead>{copy('Arabic')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {GROUPS.map(([key, groupLabel]) => (
                <TableRow key={key}>
                  <TableCell className="max-w-72 whitespace-normal font-medium">
                    {copy(GROUP_LABELS[groupLabel] ?? groupLabel)}
                  </TableCell>
                  {(['en', 'ar'] as Locale[]).map((locale) => {
                    const group = data.groups[locale][key];
                    return (
                      <TableCell key={locale} className="align-top">
                        {group.impressions === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums">
                            <span title={copy('Average position')}>
                              {displayPosition(group.position)}
                            </span>
                            <span className="text-muted-foreground">
                              {n(group.impressions)} {copy('Impressions')}
                            </span>
                            <span className="text-muted-foreground">
                              {n(group.clicks)} {copy('Clicks')}
                            </span>
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy('Top searches')}</CardTitle>
          <CardDescription>{copy('Top 20 queries that reached this place.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data.queries.length ? (
            <p className="text-sm text-muted-foreground">
              {copy('No Google data in this window.')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy('Search')}</TableHead>
                    <TableHead className="text-end">{copy('Average position')}</TableHead>
                    <TableHead className="text-end">{copy('Impressions')}</TableHead>
                    <TableHead className="text-end">{copy('Clicks')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.queries.map((query) => (
                    <TableRow key={`${query.locale ?? ''}-${query.query}`}>
                      <TableCell className="max-w-80 whitespace-normal">
                        <span dir="auto" className="font-medium">{query.query}</span>
                        {query.locale && (
                          <span className="ms-2 text-muted-foreground">
                            {query.locale === 'ar' ? copy('Arabic') : copy('English')}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {displayPosition(query.position)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{n(query.impressions)}</TableCell>
                      <TableCell className="text-end tabular-nums">{n(query.clicks)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy('Weekly trend')}</CardTitle>
          <CardDescription>{copy('Impressions by week.')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data.trend.length ? (
            <p className="text-sm text-muted-foreground">{copy('No Google data in this window.')}</p>
          ) : (
            <ul className="space-y-2" aria-label={copy('Weekly trend')}>
              {data.trend.map((point) => (
                <li key={point.week} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground tabular-nums">
                    {point.week}
                  </span>
                  <span className="h-2 min-w-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(2, (point.impressions / maxTrend) * 100)}%` }}
                    />
                  </span>
                  <span className="w-16 text-end tabular-nums">{n(point.impressions)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{copy('Index status')}</CardTitle>
            <CardDescription>{copy('What Google says about these two pages.')}</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => void inspect()} disabled={busy}>
            <ShieldCheck aria-hidden="true" />
            {copy(busy ? 'Checking…' : 'Check now')}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {(['en', 'ar'] as Locale[]).map((locale) => {
            const index = data.index[locale];
            return (
              <div key={locale} className="space-y-2 rounded-lg bg-muted p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {copy(locale === 'ar' ? 'Arabic' : 'English')}
                  {index ? (
                    <span
                      className={
                        index.verdict === 'PASS'
                          ? 'text-success'
                          : index.verdict === 'UNKNOWN'
                            ? 'text-muted-foreground'
                            : 'text-destructive'
                      }
                    >
                      {index.verdict}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{copy('Not checked')}</span>
                  )}
                </p>
                {index ? (
                  <>
                    <p className="text-muted-foreground">
                      {copy('Last crawl')}: {index.lastCrawl ? dashboardDateTime(index.lastCrawl, lang) : copy('—')}
                    </p>
                    <p className="break-all text-muted-foreground" dir="ltr">
                      {copy('Google canonical')}: {index.googleCanonical || '—'}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    {copy('Google has not checked this page yet.')}
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{copy('Google snippet preview')}</CardTitle>
          <CardDescription>{copy('How the result can look. Google may rewrite it.')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          {(['en', 'ar'] as Locale[]).map((locale) => {
            const meta = data.metadata[locale];
            const url = `${publicBase}${data.place.urls[locale]}`;
            return (
              <div key={locale} className="space-y-1" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                <p className="text-xs font-medium text-muted-foreground">
                  {copy(locale === 'ar' ? 'Arabic' : 'English')}
                </p>
                <p className="text-xs text-muted-foreground">{url}</p>
                <p className="text-lg text-primary">
                  {meta?.title || copy('No title')}
                </p>
                <p className="text-sm text-muted-foreground" dir="auto">
                  {meta?.description || copy('No description')}
                </p>
                <a
                  className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {copy('Open the page')}
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
