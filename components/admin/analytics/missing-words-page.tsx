'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { resolveTerm, reverseTerm, type ReportPage, type GapRow, type Keyword } from '@/lib/api/search-insights';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useInsightFilters } from './analytics-shell';
import { RecordList, useListAddress } from '../record-list';
import { RecordCell } from '../record-cell';
import { RequestError, SavedRefreshError } from '../subscriber-ui';
import { useDashboardCopy } from '../dashboard-text';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export function MissingWordsPage() {
  const { query } = useInsightFilters();
  const { from, to, platform, cityId } = query;
  const address = useListAddress('gaps');
  const { query: q, skip, limit } = address;
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const readOnly = useDashboardReadOnly();
  const [choosing, setChoosing] = React.useState<GapRow | null>(null);
  const [keyword, setKeyword] = React.useState<string>('');
  const [busy, setBusy] = React.useState(false);
  const submitting = React.useRef(false);
  const [error, setError] = React.useState('');
  const [undo, setUndo] = React.useState<string[]>([]);
  const keywordAddress = useListAddress('gap-keywords');
  const { query: search, skip: keywordSkip, limit: keywordLimit } = keywordAddress;
  const loadKeywords = React.useCallback(() => choosing ? adminApi.get<ReportPage<Keyword>>('/v1/admin/tags', { search, skip: keywordSkip, limit: keywordLimit }) : Promise.resolve({ data: [], meta: { total: 0, skip: 0, limit: keywordLimit } }), [choosing, search, keywordSkip, keywordLimit]);
  const keywords = useSubscriberResource(loadKeywords);
  const load = React.useCallback(() => adminApi.get<ReportPage<GapRow>>('/v1/admin/analytics/search/gaps', { from, to, platform, cityId, q, skip, limit }), [from, to, platform, cityId, q, skip, limit]);
  const resource = useSubscriberResource(load);
  const locked = busy || resource.loading || resource.savedRefreshFailed || !!resource.error;
  const decide = async (term: string, tagId?: string, reverse = false) => {
    if (submitting.current || readOnly || locked) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      if (reverse) { await reverseTerm(term); setUndo((current) => current.filter((value) => value !== term)); }
      else { await resolveTerm(term, tagId); setUndo((current) => [...new Set([...current, term])]); setChoosing(null); }
      if (await resource.refreshAfterSave()) toast.success(copy(reverse ? 'Decision undone' : tagId ? 'Spelling saved' : 'Ignored word'));
    } catch (caught) {
      setError(copy(caught instanceof AdminApiError && caught.status === 409 ? 'This term changed or belongs to another keyword. Refresh and review it before trying again.' : 'Could not save this word decision. Your choice is kept.'));
    } finally { submitting.current = false; setBusy(false); }
  };
  return <div className="space-y-4"><h2 className="text-xl font-semibold">{copy('Missing words')}</h2><p className="text-sm text-muted-foreground">{copy('Lost searches are a prioritization estimate, not a count of failed sessions. Suggestions never assign a keyword automatically.')}</p>
    {readOnly && <p className="text-sm text-muted-foreground">{copy('Read only: viewers cannot change keywords or decisions.')}</p>}
    {error && <RequestError message={error} retry={() => { void resource.refetch(); }} />}
    {resource.savedRefreshFailed && <SavedRefreshError retry={() => { void resource.refetch(); }} />}
    {!!undo.length && <Card><CardHeader><CardTitle>{copy('Recent decisions')}</CardTitle></CardHeader><CardContent><RecordList scope="decisions" records={undo} searchText={(term) => term} render={(terms) => <ul className="divide-y">{terms.map((term) => <li key={term} className="flex flex-wrap items-center justify-between gap-3 py-3"><RecordCell icon="search" name={term} />{!readOnly && <Button variant="outline" disabled={locked} onClick={() => { void decide(term, undefined, true); }}>{copy('Undo decision')}</Button>}</li>)}</ul>} /></CardContent></Card>}
    {resource.error ? <RequestError message={copy('Could not load missing words.')} retry={() => { void resource.refetch(); }} /> : <Card><CardContent><RecordList scope="gaps" address={address} records={resource.data?.data ?? []} total={resource.data?.meta.total ?? 0} busy={resource.loading} searchText={(row) => row.term} render={(rows) => <ul className="divide-y">{rows.map((row) => <li key={row.term} className="space-y-3 py-4"><RecordCell icon="search" name={row.term} context={`${row.lostSearches.toLocaleString(lang)} ${copy('lost searches · selected period')}`} /><p className="text-sm text-muted-foreground">{copy('Suggested keywords')}: {row.suggestedKeywords.map((item) => item.name).join(' · ') || copy('None')}</p>{!readOnly && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={locked} onClick={() => { setChoosing(row); setKeyword(''); }}>{copy('Make it a spelling of…')}</Button><Button variant="outline" disabled={locked} onClick={() => { void decide(row.term); }}>{copy('Ignore word')}</Button></div>}</li>)}</ul>} /></CardContent></Card>}
    <Dialog open={!!choosing} onOpenChange={(open) => { if (!open && !busy) setChoosing(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogTitle>{copy('Make it a spelling of…')}</DialogTitle><DialogDescription>{choosing?.term}</DialogDescription>
      {keywords.error ? <RequestError message={copy('Could not load keywords.')} retry={() => { void keywords.refetch(); }} /> : <RecordList scope="gap-keywords" address={keywordAddress} records={keywords.data?.data ?? []} total={keywords.data?.meta.total ?? 0} busy={keywords.loading} searchText={(row) => row.name} render={(rows) => <ul className="divide-y">{rows.map((row) => <li key={row.id} className="flex items-center justify-between gap-3 py-2"><RecordCell icon="tag" nameAr={row.name} nameEn={row.nameEn} /><label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm"><input type="radio" name="gap-keyword" className="size-5" aria-label={`${copy('Choose keyword')}: ${row.name}`} checked={keyword === row.id} disabled={busy} onChange={() => setKeyword(row.id)} />{copy(keyword === row.id ? 'Selected' : 'Choose keyword')}</label></li>)}</ul>} />}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button disabled={!keyword || locked || keywords.loading || !!keywords.error} onClick={() => { if (choosing) void decide(choosing.term, keyword); }}>{copy(busy ? 'Saving…' : 'Save spelling')}</Button>
    </DialogContent></Dialog>
  </div>;
}
