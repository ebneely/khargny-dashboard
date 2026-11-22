'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { loadLeads, type LeadsReport } from '@/lib/api/algorithm';
import { useDashboardCopy } from '../dashboard-text';
import { RequestError } from '../subscriber-ui';
import { SearchTermsPage } from '../analytics/search-terms-page';
import { MissingWordsPage } from '../analytics/missing-words-page';
import { LearnedKeywords } from '../analytics/learned-keywords';
import { useInsightFilters } from './insight-filters';

/** Decision 0006/0007 Demand: what people search, where search leads, where it misses, and what it learned. */
export function AlgorithmDemandPage() {
  const copy = useDashboardCopy();
  const { window, query, people } = useInsightFilters();
  const load = React.useCallback(() => loadLeads(window, query.cityId), [window, query.cityId]);
  const leads = useSubscriberResource<LeadsReport>(load);
  return <div className="space-y-8">
    <section aria-labelledby="algorithm-demand-top" className="space-y-3">
      <div><h2 id="algorithm-demand-top" className="text-xl font-semibold">{copy('What people look for')}</h2><p className="mt-1 text-sm text-muted-foreground">{copy('A lead is a search followed by tapping a place; converted means the same person went or called within 7 days.')} {people !== 'all' ? copy('Searches count every search, not people; the totals above follow the count switch.') : ''}</p></div>
      {leads.loading ? <div className="h-40 animate-pulse rounded-lg bg-muted" aria-busy="true" />
        : leads.error || !leads.data ? <RequestError message={copy('Could not load leads.')} retry={() => { void leads.refetch(); }} />
          : <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardHeader><CardTitle>{copy('From search to visit')}</CardTitle></CardHeader><CardContent>
              {!leads.data.leads.length ? <p className="text-sm text-muted-foreground">{copy('No lead recorded in this window.')}</p>
                : <table className="w-full text-sm"><thead><tr className="text-muted-foreground"><th className="py-2 text-start font-normal">{copy('Search terms')}</th><th className="py-2 text-end font-normal">{copy('Searches')}</th><th className="py-2 text-end font-normal">{copy('Leads')}</th><th className="py-2 text-end font-normal">{copy('Went')}</th></tr></thead>
                  <tbody className="divide-y">{leads.data.leads.slice(0, 10).map((row) => <tr key={row.term} className="h-12"><td className="py-2 pe-3 font-medium" dir="auto">{row.term}</td><td className="py-2 text-end tabular-nums text-muted-foreground">{row.searches.toLocaleString('en-US')}</td><td className="py-2 text-end tabular-nums">{row.leads.toLocaleString('en-US')}</td><td className="py-2 text-end tabular-nums text-muted-foreground">{row.converted.toLocaleString('en-US')}</td></tr>)}</tbody></table>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle>{copy('Missed demand')}</CardTitle><p className="text-sm text-muted-foreground">{copy('Shown but nobody tapped')}</p></CardHeader><CardContent>
              {!leads.data.missedDemand.length ? <p className="text-sm text-muted-foreground">{copy('No missed demand in this window.')}</p>
                : <ul className="divide-y">{leads.data.missedDemand.slice(0, 10).map((row) => <li key={row.term} className="flex min-h-12 items-center justify-between gap-3"><span dir="auto" className="min-w-0 truncate">{row.term}</span><span className="shrink-0 text-end text-sm tabular-nums text-muted-foreground">{row.searches.toLocaleString('en-US')} {copy('Searches')} · {row.shownButNoTap.toLocaleString('en-US')} {copy('Shown but nobody tapped')}</span></li>)}</ul>}
            </CardContent></Card>
          </div>}
    </section>
    <SearchTermsPage />
    <MissingWordsPage />
    <LearnedKeywords />
  </div>;
}
