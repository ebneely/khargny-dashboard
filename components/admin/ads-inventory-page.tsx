'use client';

import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentSkeleton } from '@/components/admin/content-skeleton';
import { AdsPageHeader } from '@/components/admin/ads-page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin-client';
import { displayName, formatDay, type AdInventory, type AdInventoryDay, type AdInventoryScope } from '@/lib/api/ads';
import { cn } from '@/lib/utils';

const CELL_STYLES = {
  free: 'bg-success-bg text-success hover:bg-success-bg/70',
  partial: 'bg-info-bg text-info hover:bg-info-bg/70',
  full: 'bg-warning-bg text-warning hover:bg-warning-bg/70',
  oversold: 'bg-error-bg text-error hover:bg-error-bg/70',
} as const;

const RANGE_DAYS = 56;
const STEP_DAYS = 28;

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function AdsInventoryPage() {
  const controlCopy = useDashboardCopy();
  const [inventory, setInventory] = React.useState<AdInventory | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  // null = the server default (today in Cairo, 8 weeks).
  const [from, setFrom] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = from ? `?from=${from}&to=${shiftDate(from, RANGE_DAYS - 1)}` : '';
      setInventory(await adminApi.get<AdInventory>(`/v1/admin/ads/inventory${query}`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load ad inventory.');
    } finally {
      setLoading(false);
    }
  }, [from]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const move = (days: number) => {
    const base = from ?? inventory?.from;
    if (base) setFrom(shiftDate(base, days));
  };

  return (
    <div>
      <AdsPageHeader
        title="Ad inventory"
        description={inventory
          ? `${formatDay(inventory.from)} – ${formatDay(inventory.to)} · ${inventory.timezone}`
          : 'Booked capacity across national and city placements.'}
        actions={
          <>
            <Button data-ro-allow="true" variant="outline" onClick={() => move(-STEP_DAYS)} disabled={loading || !inventory} aria-label={controlCopy("Previous 4 weeks")}>
              <ChevronLeft className="size-4" /><DashboardText>4 weeks</DashboardText>
            </Button>
            <Button data-ro-allow="true" variant="outline" onClick={() => setFrom(null)} disabled={loading || from === null}><DashboardText>Today</DashboardText></Button>
            <Button data-ro-allow="true" variant="outline" onClick={() => move(STEP_DAYS)} disabled={loading || !inventory} aria-label={controlCopy("Next 4 weeks")}>
              <DashboardText>4 weeks</DashboardText><ChevronRight className="size-4" />
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label={controlCopy("Inventory legend")}>
        <Legend className={CELL_STYLES.free} label="Free" />
        <Legend className={CELL_STYLES.partial} label="Partly sold" />
        <Legend className={CELL_STYLES.full} label="Full" />
        <Legend className={CELL_STYLES.oversold} label="Oversold" />
        <span><DashboardText>Each cell shows booked / capacity. Select a booked day to view those campaigns.</DashboardText></span>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <ContentSkeleton />
          ) : error ? (
            <div className="py-12 text-center" role="alert"><p className="mb-3 text-sm text-destructive">{error}</p><Button data-ro-allow="true" variant="outline" onClick={() => void load()}><DashboardText>Retry</DashboardText></Button></div>
          ) : !inventory || inventory.scopes.length === 0 ? (
            <div className="py-12 text-center"><p className="font-medium"><DashboardText>No inventory scopes available</DashboardText></p><p className="mt-1 text-sm text-muted-foreground"><DashboardText>Active city scopes will appear here when the API returns them.</DashboardText></p></div>
          ) : (
            <InventoryGrid inventory={inventory} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InventoryGrid({ inventory }: { inventory: AdInventory }) {
  const days = inventory.scopes[0]?.days ?? [];
  return (
    <div className="max-h-[70vh] overflow-auto rounded-lg border">
      <table className="w-max min-w-full border-collapse text-xs">
        <thead className="sticky top-0 z-20 bg-card">
          <tr>
            <th className="sticky left-0 z-30 min-w-48 border-b border-r bg-card px-3 py-3 text-left font-medium"><DashboardText>Scope</DashboardText></th>
            {days.map((day) => (
              <th key={day.date} className="min-w-20 border-b px-2 py-3 text-center font-medium">
                <span className="block text-muted-foreground">{weekday(day.date)}</span>
                <span>{formatDay(day.date)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {inventory.scopes.map((scope) => (
            <tr key={`${scope.placement}-${scope.cityId ?? 'all'}`} className="border-b last:border-b-0">
              <th className="sticky left-0 z-10 border-r bg-card px-3 py-3 text-left font-normal shadow-[1px_0_0_var(--border)]">
                <span className="block font-medium">{scope.placement === 'featured' ? 'Featured' : 'Top 10'}</span>
                <span className="block text-muted-foreground">{scopeLabel(scope)}</span>
              </th>
              {scope.days.map((day) => <InventoryCell key={day.date} scope={scope} day={day} />)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InventoryCell({ scope, day }: { scope: AdInventoryScope; day: AdInventoryDay }) {
  const status = day.booked === 0
    ? 'free'
    : day.booked > day.capacity
      ? 'oversold'
      : day.booked === day.capacity
        ? 'full'
        : 'partial';
  const content = (
    <span className="block px-2 py-4 text-center font-semibold tabular-nums" title={`${day.date}: ${day.booked} of ${day.capacity} booked`}>
      {status === 'oversold' && <span aria-hidden="true">! </span>}
      {day.booked}/{day.capacity}
      <span className="sr-only"> {status === 'oversold' ? 'oversold, campaigns rotate' : status}</span>
    </span>
  );

  return (
    <td className="border-l border-card p-1">
      {day.campaignIds.length > 0 ? (
        <Link href={campaignLink(scope, day)} className={cn('block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50', CELL_STYLES[status])}>
          {content}
        </Link>
      ) : (
        <span className={cn('block rounded-md', CELL_STYLES[status])}>{content}</span>
      )}
    </td>
  );
}

function campaignLink(scope: AdInventoryScope, day: AdInventoryDay): string {
  const query = new URLSearchParams({
    placement: scope.placement,
    campaignIds: day.campaignIds.join(','),
  });
  if (scope.cityId) query.set('cityId', scope.cityId);
  return `/dashboard/ads?${query.toString()}`;
}

function scopeLabel(scope: AdInventoryScope): string {
  if (scope.placement === 'featured') return 'All Egypt';
  return scope.city ? displayName(scope.city.name, scope.city.nameEn) : 'All Egypt';
}

function weekday(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className="flex items-center gap-1.5"><span className={cn('size-3 rounded-sm', className)} aria-hidden="true" /><DashboardText>{label}</DashboardText></span>;
}
