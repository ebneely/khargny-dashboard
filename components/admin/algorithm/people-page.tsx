'use client';

import { useDashboardCopy } from '../dashboard-text';
import { InsightsDashboard } from '../insights/insights-dashboard';

/** Decision 0009: who is coming, where they are, and how trust weight splits, for the chosen window. */
export function AlgorithmPeoplePage() {
  const copy = useDashboardCopy();
  return <div className="space-y-6">
    <section aria-labelledby="algorithm-people-head">
      <h2 id="algorithm-people-head" className="text-xl font-semibold">{copy('Who is coming?')}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{copy('The count switch changes the tiles that have people prepared. Web people are estimated until the year-long browser ID ships.')}</p>
    </section>
    <InsightsDashboard />
  </div>;
}
