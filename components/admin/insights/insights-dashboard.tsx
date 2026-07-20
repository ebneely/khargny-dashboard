'use client';

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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
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

export function InsightsDashboard({ lang }: { lang: 'ar' | 'en' }) {
  const { data, isLoading, isError, refetch } = useAnalyticsOverview();
  const [measure, setMeasure] = React.useState<MeasureKey>('views');

  const label = (ar: string | null, en: string | null, fallback: string) =>
    (lang === 'ar' ? ar || en : en || ar) || fallback;

  const cityRows: RankedRow[] = React.useMemo(
    () =>
      (data?.byCity ?? [])
        .map((c) => ({
          key: c.key,
          label: label(c.labelAr, c.labelEn, c.key),
          value: c[measure],
          meta: `${c.places.toLocaleString('en-US')} places`,
        }))
        .sort((a, b) => b.value - a.value),
    [data, measure, lang],
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
          meta: `${r.places.toLocaleString('en-US')} places`,
        }))
        .sort((a, b) => b.value - a.value),
    [data, measure, lang],
  );

  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-foreground">
          <TriangleAlert className="size-4 text-brand-700" aria-hidden="true" />
          <p className="text-sm font-medium">Couldn&apos;t load insights.</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          The analytics endpoint didn&apos;t respond. This is the only thing on this page that
          failed — the rest of the dashboard is unaffected.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
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
          Engagement
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
            hint={t?.draftPlaces ? `${t.draftPlaces} in draft` : undefined}
            icon={MapPin}
            loading={isLoading}
          />
        </div>
      </section>

      {/* Catalogue size — context, deliberately quieter than engagement. */}
      <section aria-labelledby="insights-catalogue">
        <h2 id="insights-catalogue" className="sr-only">
          Catalogue
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Cities" value={t?.cities ?? 0} icon={Building2} loading={isLoading} />
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
              Where the engagement is
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Ranked by {MEASURES.find((m) => m.key === measure)?.label.toLowerCase()}.
            </p>
          </div>
          {/* One measure at a time: the three differ by an order of magnitude, so plotting
              them on one axis would flatten two of them into nothing. */}
          <div
            className="flex shrink-0 rounded-md border border-border p-0.5"
            role="group"
            aria-label="Measure"
          >
            {MEASURES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMeasure(m.key)}
                aria-pressed={measure === m.key}
                className={
                  measure === m.key
                    ? 'rounded px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50'
                    : 'rounded px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground'
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="city" className="p-4 sm:p-5">
          <TabsList>
            <TabsTrigger value="city">By city</TabsTrigger>
            <TabsTrigger value="region">By area</TabsTrigger>
          </TabsList>
          <TabsContent value="city" className="mt-4">
            {isLoading ? (
              <BarsSkeleton />
            ) : (
              <RankedBars
                rows={cityRows}
                valueLabel={measure}
                emptyLabel="No cities yet."
              />
            )}
          </TabsContent>
          <TabsContent value="region" className="mt-4">
            {isLoading ? (
              <BarsSkeleton />
            ) : (
              <RankedBars
                rows={regionRows}
                valueLabel={measure}
                emptyLabel="No places have an area set yet."
              />
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* A table, not a chart: ten named rows across three measures is what a table is for. */}
      <section className="rounded-lg border border-border bg-card" aria-labelledby="insights-top">
        <div className="border-b border-border p-4 sm:p-5">
          <h2 id="insights-top" className="font-display text-lg font-semibold text-foreground">
            Most-viewed places
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" className="px-4 py-2 font-medium sm:px-5">Place</th>
                <th scope="col" className="px-4 py-2 font-medium">City</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Views</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Saves</th>
                <th scope="col" className="px-4 py-2 pe-4 text-right font-medium sm:pe-5">
                  Directions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td colSpan={5} className="px-4 py-3 sm:px-5">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : (data?.topPlaces.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground sm:px-5">
                    No places yet.
                  </td>
                </tr>
              ) : (
                data?.topPlaces.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground sm:px-5">
                      {label(p.name, p.nameEn, p.slug)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {label(p.cityAr, p.cityEn, '—')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {p.views.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {p.saves.toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3 pe-4 text-right tabular-nums text-foreground sm:pe-5">
                      {p.directions.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
