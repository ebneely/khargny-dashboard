'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { localeFor } from '@/lib/locale';
import { regionLabel, findRegion } from '@/lib/egypt-regions';
import { GovIcon } from '@/components/gov-icon';
import { numbersRange, readNumbersWindow } from '@/components/admin/analytics/window-switch';
import { RankedBars, type RankedRow } from './ranked-bars';

type Count = { sessions: number; devices: number };
type GpsReport = Count & {
  gpsSessions: number;
  gpsDevices: number;
  gpsShare: number;
  outsideEgypt: Count;
  cities: (Count & { cityId: string; name: string | null; nameEn: string | null; slug: string | null })[];
  areas: (Count & { region: string; cityId: string | null })[];
};

const COPY = {
  en: { title: 'Where viewers are (GPS)', body: 'Sessions whose phone or browser already had location on. We never ask for it for this.', gpsOn: 'of sessions had GPS on', outside: 'Outside Egypt', sessions: 'sessions', devices: 'devices', areas: 'Top areas', empty: 'No sessions with GPS on in this window.', error: 'Could not load GPS viewers.' },
  ar: { title: 'أماكن المشاهدين (GPS)', body: 'الزيارات التي كان موقع الهاتف أو المتصفح فيها مفعّلًا من قبل. لا نطلبه لهذا أبدًا.', gpsOn: 'من الزيارات كان الـGPS فيها مفعّلًا', outside: 'خارج مصر', sessions: 'زيارة', devices: 'جهاز', areas: 'أكثر المناطق', empty: 'لا زيارات بموقع مفعّل في هذه الفترة.', error: 'تعذّر تحميل أماكن المشاهدين.' },
};

/** Numbers > People: viewers by the city their GPS puts them in (GET /v1/admin/analytics/gps), for the page's window. */
export function GpsViewersCard() {
  const { lang } = useDashboardLang();
  const t = COPY[lang === 'ar' ? 'ar' : 'en'];
  const params = useSearchParams();
  const range = numbersRange(readNumbersWindow(params), params);
  const key = JSON.stringify(range);
  const load = React.useCallback(() => adminApi.get<GpsReport>('/v1/admin/analytics/gps', JSON.parse(key)), [key]);
  const { data, loading, error } = useSubscriberResource(load);
  const n = (v: number) => v.toLocaleString(localeFor(lang));
  const meta = (c: Count) => `${n(c.sessions)} ${t.sessions} · ${n(c.devices)} ${t.devices}`;
  const cities: RankedRow[] = (data?.cities ?? []).map((c) => ({
    key: c.cityId,
    label: (lang === 'ar' ? c.name || c.nameEn : c.nameEn || c.name) ?? c.cityId,
    leading: <GovIcon city={{ slug: c.slug, nameEn: c.nameEn, name: c.name }} className="size-5" />,
    value: c.sessions,
    meta: meta(c),
  }));
  if (data?.outsideEgypt.sessions) cities.push({ key: 'outside', label: t.outside, value: data.outsideEgypt.sessions, meta: meta(data.outsideEgypt) });
  const areas: RankedRow[] = (data?.areas ?? []).map((a) => ({
    key: `${a.cityId}|${a.region}`,
    label: regionLabel(a.region, lang) || a.region,
    leading: <GovIcon city={{ nameEn: findRegion(a.region)?.governorate }} className="size-5" />,
    value: a.sessions,
    meta: meta(a),
  }));
  return (
    <section data-slot="gps-viewers" className="rounded-lg border border-border bg-card" aria-labelledby="gps-viewers">
      <div className="flex flex-col gap-1 border-b border-border p-4 sm:p-5">
        <h2 id="gps-viewers" className="font-display text-lg font-semibold text-foreground">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.body}</p>
      </div>
      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-[1fr_1fr]">
        {error ? <p role="alert" className="text-sm text-destructive">{t.error}</p> : loading || !data ? <div className="h-24 animate-pulse rounded bg-muted" aria-hidden="true" /> : <>
          <div className="space-y-4">
            <p><span className="font-display text-3xl font-semibold tabular-nums">{data.gpsShare.toLocaleString(localeFor(lang), { style: 'percent', maximumFractionDigits: 1 })}</span> <span className="text-sm text-muted-foreground">{t.gpsOn} ({n(data.gpsSessions)} / {n(data.sessions)})</span></p>
            <RankedBars scope="gps-cities" rows={cities} valueLabel={t.sessions} emptyLabel={t.empty} />
          </div>
          {areas.length > 0 && <div className="space-y-4"><h3 className="text-sm font-medium text-muted-foreground">{t.areas}</h3><RankedBars scope="gps-areas" rows={areas} valueLabel={t.sessions} emptyLabel={t.empty} /></div>}
        </>}
      </div>
    </section>
  );
}
