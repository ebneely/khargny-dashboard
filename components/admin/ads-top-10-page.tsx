'use client';

import { DashboardText } from '@/components/admin/dashboard-text';
import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, MapPin, Trophy } from 'lucide-react';
import { ContentSkeleton } from '@/components/admin/content-skeleton';
import { AdsPageHeader } from '@/components/admin/ads-page-header';
import { RecordList } from './record-list';
import { RecordCell } from './record-cell';
import { placeCover } from '@/lib/place-list';
import { StatusBadge } from './subscriber-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi, toList } from '@/lib/api/admin-client';
import {
  displayName,
  formatCount,
  type AdCitySummary,
  type TopPlaceComponents,
  type TopPlacesPreview,
} from '@/lib/api/ads';

const COMPONENT_LABELS: { key: keyof TopPlaceComponents; label: string }[] = [
  { key: 'rating', label: 'Rating' },
  { key: 'saves', label: 'Saves' },
  { key: 'directions', label: 'Directions' },
  { key: 'views', label: 'Views' },
];

export function AdsTop10Page({ initialCity = "all" }: { initialCity?: string }) {
  const [cities, setCities] = React.useState<AdCitySummary[]>([]);
  const [citySlug, setCitySlug] = React.useState(initialCity);
  const [preview, setPreview] = React.useState<TopPlacesPreview | null>(null);
  const requestRef = React.useRef(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const [cityResponse, previewResponse] = await Promise.all([
        adminApi.get<unknown>('/v1/admin/cities', { status: 'active', limit: 100 }),
        adminApi.get<TopPlacesPreview>('/v1/admin/ads/top-places/preview', {
          city: citySlug === 'all' ? undefined : citySlug,
        }),
      ]);
      if (requestId === requestRef.current) {
        setCities(toList<AdCitySummary>(cityResponse).items);
        setPreview(previewResponse);
      }
    } catch (caught) {
      if (requestId === requestRef.current) {
        setError(caught instanceof Error ? caught.message : 'Could not load the Top 10 preview.');
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [citySlug]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <AdsPageHeader title="Manage Top 10" description="Inspect the earned ranking, sponsored slots and current fair-rotation queue." />

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-(--radius-ds-lg) bg-card p-4 shadow-(--shadow-ds-sm)">
        <div>
          <label htmlFor="top10-city" className="mb-2 block text-sm font-medium"><DashboardText>City scope</DashboardText></label>
          <Select value={citySlug} onValueChange={(value) => { if (!value) return; setCitySlug(value); const params = new URLSearchParams(window.location.search); params.set('city', value); window.history.replaceState(null, '', `${window.location.pathname}?${params}${window.location.hash}`); }}>
            <SelectTrigger data-ro-allow="true" id="top10-city" className="h-11 min-w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all"><DashboardText>All Egypt</DashboardText></SelectItem>
              {cities.map((city) => <SelectItem key={city.id} value={city.slug}>{displayName(city.name, city.nameEn)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {preview && (
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground"><DashboardText>Eligible candidates</DashboardText></p>
            <p className="font-display text-2xl font-semibold tabular-nums">{formatCount(preview.candidates)}</p>
          </div>
        )}
      </div>

      {loading ? (
        <ContentSkeleton />
      ) : error ? (
        <Card><CardContent className="py-12 text-center" role="alert"><p className="mb-3 text-sm text-destructive">{error}</p><Button data-ro-allow="true" variant="outline" onClick={() => void load()}><DashboardText>Retry</DashboardText></Button></CardContent></Card>
      ) : preview ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Trophy className="size-4 text-primary" /><DashboardText>Ranked list</DashboardText></CardTitle>
              <p className="text-sm text-muted-foreground"><DashboardText>Ranked by rating, saves, directions and views. Sponsored rows replace the rank number.</DashboardText></p>
            </CardHeader>
            <CardContent className="space-y-2">
              {preview.items.length > 0 ? <RecordList scope="top10-preview" records={preview.items} searchText={item => `${item.place.name} ${item.place.nameEn ?? ''}`} render={visible => <div className="space-y-2">{visible.map((item) => (
                <article key={`${item.position}-${item.campaignId ?? item.place.id}`} className={item.sponsored ? 'rounded-lg border border-warning bg-warning-bg p-4' : 'rounded-lg border p-4'}>
                  <div className="flex items-start gap-3">
                    <div className={item.sponsored
                      ? 'flex h-8 min-w-20 shrink-0 items-center justify-center rounded-full bg-warning px-3 text-xs font-semibold text-white'
                      : 'flex size-10 shrink-0 items-center justify-center rounded-full bg-muted font-display text-lg font-semibold tabular-nums'}>
                      {item.sponsored ? <DashboardText>Sponsored</DashboardText> : item.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <RecordCell nameAr={item.place.name} nameEn={item.place.nameEn} thumbnail={placeCover(item.place)} />
                          {item.place.region && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{item.place.region}</p>}
                        </div>
                        {item.sponsored ? <Badge className="bg-warning text-white"><DashboardText>Sponsored slot</DashboardText> {item.position}</Badge> : <span className="text-sm font-semibold tabular-nums"><DashboardText>Score</DashboardText> {item.score?.toFixed(1) ?? '—'}</span>}
                      </div>
                      {item.components && (
                        <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                          {COMPONENT_LABELS.map(({ key, label }) => <ComponentBar key={key} label={label} value={item.components?.[key] ?? 0} />)}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}</div>} /> : <p className="py-10 text-center text-sm text-muted-foreground"><DashboardText>No ranking candidates for this scope.</DashboardText></p>}
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle><DashboardText>Sponsored queue</DashboardText></CardTitle>
              <p className="text-sm text-muted-foreground"><DashboardText>All live Top 10 campaigns for this scope. “Shown now” reflects the current 10-minute bucket.</DashboardText></p>
            </CardHeader>
            <CardContent className="space-y-2">
              {preview.sponsoredQueue.length > 0 ? <RecordList scope="top10-queue" records={preview.sponsoredQueue} searchText={item => `${item.placeName} ${item.advertiserName}`} render={visible => <div className="space-y-2">{visible.map((item) => (
                <Link key={item.campaignId} href={`/dashboard/ads/${item.campaignId}`} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted">
                  <span className={item.shownNow ? 'mt-0.5 text-success' : 'mt-0.5 text-muted-foreground'}>
                    {item.shownNow ? <CheckCircle2 className="size-4" /> : <span className="block size-4 rounded-full border" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <RecordCell name={item.placeName} context={item.advertiserName} />
                  </div>
                  <StatusBadge status={item.shownNow ? 'live' : 'scheduled'}>{item.shownNow ? 'Shown now' : 'Queued'}</StatusBadge>
                </Link>
              ))}</div>} /> : <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"><DashboardText>No live sponsored campaigns in this scope.</DashboardText></p>}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function ComponentBar({ label, value }: { label: string; value: number }) {
  const percent = Math.max(0, Math.min(100, value * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="tabular-nums">{percent.toFixed(0)}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}
