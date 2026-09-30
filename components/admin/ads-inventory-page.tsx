'use client';

import * as React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
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

export function AdsInventoryPage() {
  const [inventory, setInventory] = React.useState<AdInventory | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInventory(await adminApi.get<AdInventory>('/v1/admin/ads/inventory'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load ad inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div>
      <AdsPageHeader
        title="Ad inventory"
        description={inventory
          ? `${formatDay(inventory.from)} – ${formatDay(inventory.to)} · ${inventory.timezone}`
          : 'Booked capacity across national and city placements.'}
      />

      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground" aria-label="Inventory legend">
        <Legend className={CELL_STYLES.free} label="Free" />
        <Legend className={CELL_STYLES.partial} label="Partly sold" />
        <Legend className={CELL_STYLES.full} label="Full" />
        <Legend className={CELL_STYLES.oversold} label="Oversold" />
        <span>Each cell shows booked / capacity. Select a booked day to view those campaigns.</span>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground" aria-busy="true"><Loader2 className="mr-2 size-4 animate-spin" />Loading inventory…</div>
          ) : error ? (
            <div className="py-12 text-center" role="alert"><p className="mb-3 text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => void load()}>Retry</Button></div>
          ) : !inventory || inventory.scopes.length === 0 ? (
            <div className="py-12 text-center"><p className="font-medium">No inventory scopes available</p><p className="mt-1 text-sm text-muted-foreground">Active city scopes will appear here when the API returns them.</p></div>
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
            <th className="sticky left-0 z-30 min-w-48 border-b border-r bg-card px-3 py-3 text-left font-medium">Scope</th>
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
      {day.booked}/{day.capacity}
      <span className="sr-only"> {status}</span>
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
  return <span className="flex items-center gap-1.5"><span className={cn('size-3 rounded-sm', className)} aria-hidden="true" />{label}</span>;
}
