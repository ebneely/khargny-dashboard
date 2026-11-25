'use client';

/**
 * Places → Location check (owner rule, 2026-11-25): the pins the team should fix, so the map, the
 * distance ranking and the ads all start from a pin that is really where the place is. Three
 * lists, each a titled bubble with its icon and its legend word, and every row opens the place.
 */
import * as React from 'react';
import Link from '@/components/lang-link';
import { Copy, Globe2, MapPinOff, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardCopy } from './dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { LoadingState, RequestError } from './subscriber-ui';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import {
  loadLocationCheck,
  type LocationCheckPlace,
  type LocationCheckReport,
} from '@/lib/api/place-location-check';

/** A pin as the row shows it: five decimals is the pin the place form writes. */
function coordinates(copy: (value: string) => string, lat: number | null, lng: number | null) {
  if (lat === null || lng === null) return copy('Unknown');
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function Legend({ report }: { report: LocationCheckReport }) {
  const copy = useDashboardCopy();
  const items = [
    { icon: <MapPinOff className="size-4" aria-hidden="true" />, word: 'Far from the centre', count: report.counts.farFromCity },
    { icon: <Copy className="size-4" aria-hidden="true" />, word: 'Shared point', count: report.counts.sharedPins },
    { icon: <Globe2 className="size-4" aria-hidden="true" />, word: 'Outside the country', count: report.counts.outsideEgypt },
  ];
  return <ul aria-label={copy('Status')} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">{items.map((item) => <li key={item.word} className="flex items-center gap-1.5 text-muted-foreground">{item.icon}<span>{copy(item.word)}</span><span className="tabular-nums text-foreground">{item.count.toLocaleString('en-US')}</span></li>)}</ul>;
}

/** One row of a place: its name opens the place, then its city, its distance and its pin. */
function PlaceRow({ place, showDistance }: { place: LocationCheckPlace; showDistance: boolean }) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  return <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2 text-sm">
    <Link href={`/dashboard/places/${place.placeId}`} className="min-w-0 flex-1 truncate font-medium hover:text-primary" dir="auto">{pick(place.name, place.nameEn)}</Link>
    <span className="text-muted-foreground">{place.city ? pick(place.city.name, place.city.nameEn) : copy('Unknown')}</span>
    {showDistance && <span className="tabular-nums text-muted-foreground">{place.distanceKm === null ? '—' : `${place.distanceKm.toLocaleString('en-US')} ${copy('km')}`}</span>}
    <span dir="ltr" className="tabular-nums text-xs text-muted-foreground">{coordinates(copy, place.lat, place.lng)}</span>
  </li>;
}

function Bubble({ icon, title, sentence, count, children }: { icon: React.ReactNode; title: string; sentence: string; count: number; children: React.ReactNode }) {
  const copy = useDashboardCopy();
  return <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">{icon}{copy(title)}<span className="tabular-nums text-sm font-normal text-muted-foreground">{count.toLocaleString('en-US')}</span></CardTitle>
      <p className="text-sm text-muted-foreground">{copy(sentence)}</p>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>;
}

export function PlaceLocationCheck() {
  return <React.Suspense fallback={<LoadingState />}><Content /></React.Suspense>;
}

function Content() {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  const resource = useSubscriberResource(loadLocationCheck);
  const report = resource.data;

  return <div className="space-y-6">
    <header>
      <h1 className="font-display text-2xl font-semibold">{copy('Location check')}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy('Pins that cannot be trusted: more than 40 km from the city centre, shared with another place, or outside Egypt. Open a row to fix the pin.')}</p>
    </header>

    {resource.loading ? <LoadingState /> : resource.error || !report ? <RequestError message={copy('Could not load the location check.')} retry={() => { void resource.refetch(); }} /> : <>
      <Legend report={report} />

      <Bubble icon={<MapPinOff className="size-4 text-muted-foreground" aria-hidden="true" />} title="More than 40 km from the city centre" sentence="The pin of a place should be where the place really is. This list is how far each pin sits from the centre of its city." count={report.counts.farFromCity}>
        {report.farFromCity.length === 0 ? <p className="py-2 text-sm text-muted-foreground">{copy('No place is that far from its city centre.')}</p> : <ul className="divide-y divide-border">{report.farFromCity.map((place) => <PlaceRow key={place.placeId} place={place} showDistance />)}</ul>}
        {report.missingCentres.length > 0 && <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground"><TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>{copy('These cities have no centre on file, so their places cannot be judged by distance')}: <span dir="auto">{report.missingCentres.map((city) => pick(city.name, city.nameEn)).join('، ')}</span></span></p>}
      </Bubble>

      <Bubble icon={<Copy className="size-4 text-muted-foreground" aria-hidden="true" />} title="Same pin as another place" sentence="Two places on one point on the map cannot both be right: one of them is wrong." count={report.counts.sharedPins}>
        {report.sharedPins.length === 0 ? <p className="py-2 text-sm text-muted-foreground">{copy('No two places share a pin.')}</p> : <div className="space-y-4">{report.sharedPins.map((group) => <div key={`${group.lat},${group.lng}`}>
          <p className="flex flex-wrap items-baseline gap-x-3 text-xs text-muted-foreground"><span dir="ltr" className="tabular-nums">{coordinates(copy, group.lat, group.lng)}</span><span>{group.count.toLocaleString('en-US')} {copy('places')}</span></p>
          <ul className="divide-y divide-border">{group.places.map((place) => <PlaceRow key={place.placeId} place={place} showDistance={false} />)}</ul>
        </div>)}</div>}
      </Bubble>

      <Bubble icon={<Globe2 className="size-4 text-muted-foreground" aria-hidden="true" />} title="Outside Egypt" sentence="A pin outside Egypt is never served to a visitor who shares a position from inside it." count={report.counts.outsideEgypt}>
        {report.outsideEgypt.length === 0 ? <p className="py-2 text-sm text-muted-foreground">{copy('No pin is outside Egypt.')}</p> : <ul className="divide-y divide-border">{report.outsideEgypt.map((place) => <PlaceRow key={place.placeId} place={place} showDistance={false} />)}</ul>}
      </Bubble>

      <p className="text-xs text-muted-foreground">{copy('Fixed pins stay off these lists.')}</p>
    </>}
  </div>;
}
