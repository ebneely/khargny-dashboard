'use client';

import * as React from 'react';
import type { AdInventory, AdPlacement } from '@/lib/api/ads';
import { adminApi } from '@/lib/api/admin-client';
import { isCalendarDate } from '@/lib/subscription-calendar';
import { bookedRange } from '@/lib/ads-round5';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardCopy } from './dashboard-text';
import { LoadingState, RequestError, useSubscriberText } from './subscriber-ui';

export function AdBookedCapacity({ from, to, placement, cityId }: { from: string; to: string; placement: AdPlacement; cityId: string | null }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const valid = isCalendarDate(from) && isCalendarDate(to) && to >= from;
  const load = React.useCallback(() => valid ? adminApi.get<AdInventory>('/v1/admin/ads/inventory', { from, to }) : Promise.resolve(null), [from, to, valid]);
  const resource = useSubscriberResource(load);
  if (!valid) return <p className="text-sm text-muted-foreground">{copy('Choose dates to see booked space.')}</p>;
  if (resource.loading) return <LoadingState />;
  if (resource.error) return <RequestError message={copy('Could not load booked space.')} retry={() => { void resource.refetch(); }} />;
  const days = resource.data ? bookedRange(resource.data, placement, cityId, from, to) : [];
  if (!days.length) return null;
  const number = (value: number) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en').format(value);
  return <section className="space-y-2 rounded-lg bg-muted p-4"><h3 className="font-semibold">{copy('Booked space for these dates')}</h3><p className="text-sm"><span dir="ltr">{from} – {to}</span> · {copy('Cairo')}</p><p className="text-sm tabular-nums">{number(Math.min(...days.map((day) => day.booked)))} – {number(Math.max(...days.map((day) => day.booked)))} {copy('booked places per day')} · {number(Math.min(...days.map((day) => Math.max(0, day.capacity - day.booked))))} {copy('minimum free places per day')}</p>{days.some((day) => day.booked >= day.capacity) && <p className="text-sm text-warning">{copy('Some dates are full. Extra bookings rotate; check the warning after saving.')}</p>}</section>;
}
