'use client';

import * as React from 'react';
import { WindowSwitch } from './window-switch';
import { useDashboardCopy } from '../dashboard-text';
import { LoadingState } from '../subscriber-ui';
import { InsightFilterControls, InsightFiltersProvider, useInsightFilters } from '../algorithm/insight-filters';

export { useInsightFilters } from '../algorithm/insight-filters';

export function AnalyticsShell({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={<LoadingState />}><InsightFiltersProvider><AnalyticsContent>{children}</AnalyticsContent></InsightFiltersProvider></React.Suspense>;
}

function AnalyticsContent({ children }: { children: React.ReactNode }) {
  const copy = useDashboardCopy();
  const { valid } = useInsightFilters();
  return <div className="min-w-0 space-y-6">
    <header><h1 className="font-display text-2xl font-semibold">{copy('Numbers')}</h1></header>
    <WindowSwitch />
    <InsightFilterControls />
    {valid && children}
  </div>;
}
