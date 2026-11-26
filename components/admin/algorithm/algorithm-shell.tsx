'use client';

import * as React from 'react';
import { Settings2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardCopy } from '../dashboard-text';
import { WindowControl, useWindowCaption } from '../analytics/window-switch';
import { PeopleSwitch, usePeopleCaption } from '../people-switch';
import { Toolbar } from '../toolbar';
import { LoadingState } from '../subscriber-ui';
import { InsightFilterControls, InsightFiltersProvider, useInsightFilters } from './insight-filters';
import { AlgorithmSettingsPanel } from './settings-panel';
import { HowItWorksPanel } from './how-it-works';

/**
 * The Algorithm section (decision 0006, v3 accepted 2026-11-14): one nav tab, each top page its own URL.
 * The window, the count and the filters live in the address, so every page and a shared link agree.
 */
export function AlgorithmShell({ children }: { children: React.ReactNode }) {
  return <React.Suspense fallback={<LoadingState />}><InsightFiltersProvider><AlgorithmContent>{children}</AlgorithmContent></InsightFiltersProvider></React.Suspense>;
}

function AlgorithmContent({ children }: { children: React.ReactNode }) {
  const copy = useDashboardCopy();
  const { people, setPeople, valid } = useInsightFilters();
  const [panel, setPanel] = React.useState<'settings' | 'how' | null>(null);
  const windowCaption = useWindowCaption(true);
  const peopleCaption = usePeopleCaption(people);
  return <div className="min-w-0 space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold">{copy('Algorithm')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy('The rules that decide what people see, and every number they move.')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button data-ro-allow="true" type="button" variant="outline" size="sm" aria-haspopup="dialog" onClick={() => setPanel('how')}><Sparkles aria-hidden="true" />{copy('How it works')}</Button>
        <Button data-ro-allow="true" type="button" variant="outline" size="sm" aria-haspopup="dialog" onClick={() => setPanel('settings')}><Settings2 aria-hidden="true" />{copy('Settings')}</Button>
      </div>
    </header>
    <Toolbar caption={<>{windowCaption}{peopleCaption ? <> · {peopleCaption}</> : null}</>}>
      <WindowControl here />
      <PeopleSwitch value={people} onValueChange={setPeople} />
    </Toolbar>
    <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">{copy('Team only. Customers never see these numbers or statuses.')}</span> {copy('Every number follows the window. Answers and Money count every action; the tiles and lists follow the count switch.')}</p>
    <InsightFilterControls />
    {valid && children}
    <AlgorithmSettingsPanel open={panel === 'settings'} onOpenChange={(open) => setPanel(open ? 'settings' : null)} />
    <HowItWorksPanel open={panel === 'how'} onOpenChange={(open) => setPanel(open ? 'how' : null)} />
  </div>;
}
