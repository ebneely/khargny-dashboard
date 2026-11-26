'use client';

import * as React from 'react';
import { adminApi } from '@/lib/api/admin-client';
import { useDashboardCopy } from './dashboard-text';
import { LiveBadge } from './live-badge';

/**
 * PLACES-DIRECTION §13 cascade, item 10: the live count per area of one city, read
 * from the stored cascade counts. An area at 0 is hidden from the public website;
 * the count and the marker say which ones.
 */
export function CityLiveAreas({ cityId }: { cityId: string }) {
  const copy = useDashboardCopy();
  const [state, setState] = React.useState<{
    cityId: string;
    rows: { region: string; live: number }[] | null;
  }>({ cityId, rows: null });

  React.useEffect(() => {
    let live = true;
    adminApi
      .get<{ region: string; live: number }[]>(`/v1/admin/cities/${cityId}/live-areas`)
      .then((rows) => {
        if (live) setState({ cityId, rows: Array.isArray(rows) ? rows : [] });
      })
      .catch(() => {
        if (live) setState({ cityId, rows: [] });
      });
    return () => {
      live = false;
    };
  }, [cityId]);

  const rows = state.cityId === cityId ? state.rows : null;
  return (
    <div className="space-y-1 rounded-md border border-border p-2" data-slot="city-live-areas">
      <p className="text-xs text-muted-foreground">
        {copy('Public places per area. An area with none is hidden from the website.')}
      </p>
      {rows === null ? (
        <p className="text-xs text-muted-foreground">{copy('Loading…')}</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{copy('No area has places yet.')}</p>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.region} className="flex min-h-7 items-center justify-between gap-3 py-1 text-sm">
              <span className="min-w-0 truncate" dir="auto">{row.region}</span>
              <LiveBadge live={row.live} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
