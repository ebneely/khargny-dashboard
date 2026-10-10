'use client';

import { DashboardText } from '@/components/admin/dashboard-text';
import { RecordList } from '../record-list';
import { RecordCell } from '../record-cell';
import { placeCover } from '@/lib/place-list';
import * as React from 'react';
import {
  Eye,
  Heart,
  Navigation,
  MapPin,
  Building2,
  Shapes,
  FileEdit,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UrlTabs } from '@/components/ui/url-tabs';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/admin/segmented-control';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useAnalyticsOverview } from '@/lib/api/hooks/use-analytics';
import { regionLabel } from '@/lib/egypt-regions';
import { StatTile } from './stat-tile';
import { RankedBars, type RankedRow } from './ranked-bars';

/** The three engagement measures, each plotted on its own axis — never together. */
const MEASURES = [
  { key: 'views', label: 'Views', icon: Eye },
  { key: 'saves', label: 'Saves', icon: Heart },
  { key: 'directions', label: 'Directions', icon: Navigation },
] as const;
type MeasureKey = (typeof MEASURES)[number]['key'];

export function InsightsDashboard({ lang: requestedLanguage }: { lang?: 'ar' | 'en' }) {
  const { lang: currentLanguage } = useDashboardLang();
  const lang = requestedLanguage ?? currentLanguage;
  const { data, isLoading, isError, refetch } = useAnalyticsOverview();
  const [measure, setMeasure] = React.useState<MeasureKey>('views');

  const label = React.useCallback((ar: string | null, en: string | null, fallback: string) =>
    (lang === 'ar' ? ar || en : en || ar) || fallback, [lang]);

  const cityRows: RankedRow[] = React.useMemo(
    () =>
      (data?.byCity ?? [])
        .map((c) => ({
          key: c.key,
          label: label(c.labelAr, c.labelEn, c.key),
          value: c[measure],
          meta: `${c.places.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${lang === 'ar' ? 'أماكن' : 'places'}`,
        }))
        .sort((a, b) => b.value - a.value),
    [data, measure, lang, label],
  );

  const regionRows: RankedRow[] = React.useMemo(
    () =>
      (data?.byRegion ?? [])
        .map((r) => ({
          key: r.key,
          // The region column holds the English name as a key; the Arabic label comes from
          // the shared catalog, the same way every other surface resolves it.
          label: regionLabel(r.key, lang) || r.key,
          value: r[measure],
          meta: `${r.places.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${lang === 'ar' ? 'أماكن' : 'places'}`,
        }))
        .sort((a, b) => b.value - a.value),
    [data, measure, lang],
  );

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-foreground">
          <TriangleAlert className="size-4 text-brand-700" aria-hidden="true" />
          <p className="text-sm font-medium"><DashboardText>Couldn&apos;t load insights.</DashboardText></p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          <DashboardText>The analytics endpoint didn&apos;t respond. This is the only thing on this page that failed — the rest of the dashboard is unaffected.</DashboardText>
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          <DashboardText>Try again</DashboardText>
        </Button>
      </div>
    );
  }

  const t = data?.totals;

  return (
    <div className="flex flex-col gap-6">
      {/* Engagement first: the three numbers that describe what visitors did. */}
      <section aria-labelledby="insights-engagement">
        <h2 id="insights-engagement" className="sr-only">
          <DashboardText>Engagement</DashboardText>
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Views" value={t?.views ?? 0} icon={Eye} loading={isLoading} />
          <StatTile label="Saves" value={t?.saves ?? 0} icon={Heart} loading={isLoading} />
          <StatTile
            label="Directions"
            value={t?.directions ?? 0}
            icon={Navigation}
            loading={isLoading}
          />
          <StatTile
            label="Live places"
            value={t?.places ?? 0}
            hint={t?.draftPlaces ? `${t.draftPlaces} ${lang === 'ar' ? 'في المسودة' : 'in draft'}` : undefined}
            icon={MapPin}
            loading={isLoading}
          />
        </div>
      </section>

      {/* Catalogue size — context, deliberately quieter than engagement. */}
      <section aria-labelledby="insights-catalogue">
        <h2 id="insights-catalogue" className="sr-only">
          <DashboardText>Catalogue</DashboardText>
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Cities" value={t?.cities ?? 0} icon={Building2} loading={isLoading} />
          {/* Areas = distinct regions that have at least one live place, since a city can hold
              many. Counted from the byRegion breakdown the endpoint already returns. */}
          <StatTile
            label="Areas"
            value={data?.byRegion?.length ?? 0}
            hint="Across all cities"
            icon={Navigation}
            loading={isLoading}
          />
          <StatTile
            label="Categories"
            value={t?.categories ?? 0}
            icon={Shapes}
            loading={isLoading}
          />
          <StatTile
            label="Drafts"
            value={t?.draftPlaces ?? 0}
            hint="Not visible to visitors"
            icon={FileEdit}
            loading={isLoading}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card" aria-labelledby="insights-breakdown">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 id="insights-breakdown" className="font-display text-lg font-semibold text-foreground">
              <DashboardText>Where the engagement is</DashboardText>
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              <DashboardText>Ranked by</DashboardText> <DashboardText>{lang === 'ar' ? MEASURES.find((m) => m.key === measure)?.label : MEASURES.find((m) => m.key === measure)?.label.toLowerCase()}</DashboardText>.
            </p>
          </div>
          {/* One measure at a time: the three differ by an order of magnitude, so plotting
              them on one axis would flatten two of them into nothing. */}
          <SegmentedControl label="Measure" value={measure} onValueChange={(value) => setMeasure(value as typeof measure)} options={MEASURES.map(({ key, label, icon: Icon }) => ({ value: key, label, icon: <Icon aria-hidden="true" /> }))} />
        </div>

        <UrlTabs values={["city", "region"]} className="p-4 sm:p-5">
          <TabsList>
            <TabsTrigger value="city"><DashboardText>By city</DashboardText></TabsTrigger>
            <TabsTrigger value="region"><DashboardText>By area</DashboardText></TabsTrigger>
          </TabsList>
          <TabsContent keepMounted value="city" className="mt-4">
            {isLoading ? (
              <BarsSkeleton />
            ) : (
              <RankedBars
                scope="home-cities"
                rows={cityRows}
                valueLabel={measure}
                emptyLabel="No cities yet."
              />
            )}
          </TabsContent>
          <TabsContent keepMounted value="region" className="mt-4">
            {isLoading ? (
              <BarsSkeleton />
            ) : (
              <RankedBars
                scope="home-areas"
                rows={regionRows}
                valueLabel={measure}
                emptyLabel="No places have an area set yet."
              />
            )}
          </TabsContent>
        </UrlTabs>
      </section>

      {/* A table, not a chart: ten named rows across three measures is what a table is for. */}
      <section className="rounded-lg border border-border bg-card" aria-labelledby="insights-top">
        <div className="border-b border-border p-4 sm:p-5">
          <h2 id="insights-top" className="font-display text-lg font-semibold text-foreground">
            <DashboardText>Most-viewed places</DashboardText>
          </h2>
        </div>
        <div className="min-w-0 p-4 sm:p-5"><RecordList scope="home-top" records={data?.topPlaces ?? []} busy={isLoading} searchText={(place) => [place.name, place.nameEn, place.cityAr, place.cityEn].join(' ')} filters={[{ key: 'city', label: 'All cities', options: Array.from(new Map((data?.topPlaces ?? []).map((place) => [place.cityAr ?? '', { value: place.cityAr ?? '', label: label(place.cityAr, place.cityEn, '—') }])).values()).filter((option) => option.value), value: (place) => place.cityAr ?? '' }]} render={(visible) => <ul className="divide-y">{visible.map((place) => <li key={place.id} className="space-y-3 py-3"><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} context={label(place.cityAr, place.cityEn, '—')} /><dl className="grid grid-cols-3 gap-3 text-sm">{(['views', 'saves', 'directions'] as const).map((metric) => <div key={metric}><dt className="text-muted-foreground"><DashboardText>{metric === 'views' ? 'Views' : metric === 'saves' ? 'Saves' : 'Directions'}</DashboardText></dt><dd className="tabular-nums">{place[metric].toLocaleString(lang)}</dd></div>)}</dl></li>)}</ul>} /></div>
      </section>

      {/* What the numbers mean, from the API itself — so this caption cannot drift out of
          step with the counters' real semantics. */}
      {data?.meta?.note && (
        <p className="text-xs leading-relaxed text-muted-foreground">{data.meta.note}</p>
      )}
    </div>
  );
}

function BarsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
