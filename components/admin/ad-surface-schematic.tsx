'use client';

import { useDashboardCopy } from './dashboard-text';

export function AdSurfaceSchematic({ surface }: { surface: 'featured' | 'top10' | 'section' }) {
  const copy = useDashboardCopy();
  return <div role="img" aria-label={copy(surface === 'top10' ? 'Top 10 appears below the city heading.' : surface === 'featured' ? 'Featured appears near the top of the homepage.' : 'Sections appear below Featured on the homepage.')} className="grid h-28 w-full max-w-64 gap-2 rounded-lg bg-muted p-3">
    <div className="h-3 w-2/3 rounded-sm bg-border" />
    <div className={surface === 'featured' ? 'flex gap-2 rounded border border-primary p-2' : 'flex gap-2 rounded bg-background p-2'}>{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-4 flex-1 rounded-sm bg-border" />)}</div>
    <div className={surface === 'section' || surface === 'top10' ? 'flex gap-2 rounded border border-primary p-2' : 'flex gap-2 rounded bg-background p-2'}>{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-4 flex-1 rounded-sm bg-border" />)}</div>
  </div>;
}
