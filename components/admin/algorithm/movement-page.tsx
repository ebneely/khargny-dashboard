'use client';

import { useDashboardCopy } from '../dashboard-text';
import { MovementPage } from '../analytics/movement-page';

/** Decision 0006 Movement: entries, exits, the commonest steps and the session funnel. */
export function AlgorithmMovementPage() {
  const copy = useDashboardCopy();
  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold">{copy('How people move through the app')}</h2><p className="mt-1 text-sm text-muted-foreground">{copy('Paths are counted from every visit, not from people; the window and filters above apply.')}</p></div>
    <MovementPage />
  </div>;
}
