'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { CheckCheck, GitMerge, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import type { SubscriberPlace } from '@/lib/api/subscribers';
import { localeFor } from '@/lib/locale';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useRouter } from '@/lib/dash-router';
import { ActionDialog, LoadingState, RequestError, StatusBadge, type ActionSpec } from './subscriber-ui';
import { PlaceSearchPicker } from './place-search-picker';
import { useDashboardCopy } from './dashboard-text';

// GET /v1/admin/verification/places/:id (only the fields this tab reads).
interface Section { section: string; applicable: boolean; state: string; changedSinceVerified?: boolean; note?: string | null; verifiedAt?: string | null }
interface Finding { rule: string; section: string; severity: 'contradiction' | 'missing' | 'implausible'; paramsHash: string; dismissed: boolean }
interface Snapshot { sections: Section[]; findings: Finding[]; counts: { contradictions: number; needsFix: number; changed: number; neverChecked: number }; fullyVerified: boolean }
interface MergePlan { planDigest: string; conflicts: (string | { code?: string; message?: string })[]; tables: Record<string, { moved?: number; deduplicated?: number }> }

const SECTION_LABELS: Record<string, string> = { name: 'Name', category: 'Category', location: 'Location', contact: 'Contact', hours: 'Hours', media: 'Photos and videos', amenities: 'Amenities', keywords: 'Keywords', services: 'Services' };
const STATE_LABELS: Record<string, [string, string]> = { verified: ['Checked', 'active'], needs_fix: ['Needs a fix', 'paused'], not_checked: ['Not checked yet', 'draft'] };
const SEVERITY: Record<Finding['severity'], string> = { contradiction: 'Says two different things', missing: 'Missing', implausible: 'Looks wrong' };
/** A rule key read as words: "hours_overlap" → "Hours overlap". */
const ruleWords = (rule: string) => rule.replace(/[_.-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/**
 * Place > Quality: is what we show about this place right, section by section (the verification
 * module), and is it a duplicate of another place (merge). DIRECTION section 1, the Quality tab.
 */
export function PlaceQualityTab({ placeId, canWrite }: { placeId: string; canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const load = React.useCallback(() => adminApi.get<Snapshot>(`/v1/admin/verification/places/${encodeURIComponent(placeId)}`), [placeId]);
  const resource = useSubscriberResource(load);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const status = resource.error instanceof AdminApiError ? resource.error.status : 0;
  const run = async (call: () => Promise<unknown>, done: string) => { await call(); toast.success(copy(done)); await resource.refetch(); };
  const setSection = (section: string, state: 'verified' | 'needs_fix') => setAction(state === 'verified'
    ? { title: copy('Mark this section checked?'), description: copy('You confirm what the place shows here is right today.'), submit: () => run(() => adminApi.put(`/v1/admin/verification/places/${placeId}/sections/${section}`, { state }), 'Marked as checked.') }
    : { title: copy('What needs fixing?'), description: copy('One line the next person can act on.'), fields: [{ name: 'note', label: copy('Note'), required: true }], submit: (values) => run(() => adminApi.put(`/v1/admin/verification/places/${placeId}/sections/${section}`, { state, note: String(values.note).trim() }), 'Saved as needing a fix.') });
  const dismiss = (finding: Finding) => setAction(finding.dismissed
    ? { title: copy('Bring this finding back?'), submit: () => run(() => adminApi.delete(`/v1/admin/verification/places/${placeId}/findings/${encodeURIComponent(finding.rule)}/dismissal`, { paramsHash: finding.paramsHash }), 'The finding is back.') }
    : { title: copy('Dismiss this finding?'), description: copy('Say why it is fine, so nobody checks it again.'), fields: [{ name: 'reason', label: copy('Reason'), required: true }], submit: (values) => run(() => adminApi.post(`/v1/admin/verification/places/${placeId}/findings/${encodeURIComponent(finding.rule)}/dismissal`, { paramsHash: finding.paramsHash, reason: String(values.reason).trim() }), 'Dismissed.') });
  const verifyAll = () => setAction({ title: copy('Mark every clean section checked?'), description: copy('Sections with an open finding stay as they are.'), submit: async () => {
    try { await run(() => adminApi.post(`/v1/admin/verification/places/${placeId}/verify-all`), 'Every clean section is marked checked.'); }
    catch (caught) { if (caught instanceof AdminApiError && caught.status === 409) throw new Error(copy('The checks are being refreshed. Try again in a minute.')); throw caught; }
  } });

  const data = resource.data;
  const open = (data?.findings ?? []).filter((finding) => !finding.dismissed);
  const n = (value: number) => value.toLocaleString(localeFor(lang));
  return <div className="space-y-6">
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" aria-hidden="true" />{copy('Is what we show right?')}</CardTitle>
          {data && <p className="mt-1 text-sm text-muted-foreground">{data.fullyVerified ? copy('Every section is checked and nothing is open.') : `${n(open.length)} ${copy('open findings')}, ${n(data.counts.needsFix)} ${copy('sections need a fix')}, ${n(data.counts.neverChecked)} ${copy('never checked')}.`}</p>}</div>
        {canWrite && data && <Button size="sm" variant="outline" onClick={verifyAll}><CheckCheck aria-hidden="true" />{copy('Mark clean sections checked')}</Button>}
      </CardHeader>
      <CardContent>
        {resource.loading ? <LoadingState />
          : status === 404 || status === 503 ? <p className="text-sm text-muted-foreground">{copy('Checks are switched off on this server.')}</p>
          : resource.error ? <RequestError message={copy('Could not load the checks.')} retry={() => { void resource.refetch(); }} />
          : data && <ul className="divide-y divide-border">{data.sections.filter((section) => section.applicable).map((section) => {
            const [label, tone] = STATE_LABELS[section.state] ?? ['Not checked yet', 'draft'];
            const findings = open.filter((finding) => finding.section === section.section);
            return <li key={section.section} className="flex flex-wrap items-start gap-3 py-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">{copy(SECTION_LABELS[section.section] ?? ruleWords(section.section))}<StatusBadge status={tone}>{copy(label)}</StatusBadge>{section.changedSinceVerified && <StatusBadge status="scheduled">{copy('Changed since checked')}</StatusBadge>}</p>
                {section.note && <p dir="auto" className="text-sm text-muted-foreground">{section.note}</p>}
                {findings.map((finding) => <p key={finding.rule + finding.paramsHash} className="flex flex-wrap items-center gap-2 text-sm"><span className={finding.severity === 'contradiction' ? 'font-medium text-destructive' : 'text-foreground'}>{copy(SEVERITY[finding.severity])}:</span><span>{copy(ruleWords(finding.rule))}</span>{canWrite && <Button size="xs" variant="ghost" onClick={() => dismiss(finding)}>{copy('Dismiss')}</Button>}</p>)}
              </div>
              {canWrite && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSection(section.section, 'verified')}>{copy('Checked')}</Button><Button size="sm" variant="ghost" onClick={() => setSection(section.section, 'needs_fix')}>{copy('Needs a fix')}</Button></div>}
            </li>;
          })}</ul>}
        {data && data.findings.some((finding) => finding.dismissed) && <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">{copy('Dismissed findings')}</summary><ul className="mt-2 space-y-1">{data.findings.filter((finding) => finding.dismissed).map((finding) => <li key={finding.rule + finding.paramsHash} className="flex items-center gap-2">{copy(ruleWords(finding.rule))}{canWrite && <Button size="xs" variant="ghost" onClick={() => dismiss(finding)}>{copy('Bring back')}</Button>}</li>)}</ul></details>}
      </CardContent>
    </Card>
    <MergeCard placeId={placeId} canWrite={canWrite} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}

/** A duplicate is merged into the place that stays: a dry run first shows what moves, then the same plan is applied. */
function MergeCard({ placeId, canWrite }: { placeId: string; canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const router = useRouter();
  const { data: session } = useCurrentSession();
  const [into, setInto] = React.useState<SubscriberPlace | null>(null);
  const [plan, setPlan] = React.useState<MergePlan | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  if (session?.user?.role !== 'super_admin') return null;
  const body = (dryRun: boolean) => ({ intoId: into?.id, dryRun, ...(dryRun ? {} : { planDigest: plan?.planDigest }) });
  const go = async (dryRun: boolean) => {
    setBusy(true); setError('');
    try {
      const result = await adminApi.post<MergePlan>(`/v1/admin/places/${encodeURIComponent(placeId)}/merge`, body(dryRun));
      if (dryRun) setPlan(result);
      else { toast.success(copy('Merged. This place now forwards to the one that stays.')); router.push(`/dashboard/places/${into!.id}`); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : copy('Could not merge.')); }
    finally { setBusy(false); }
  };
  const moved = plan ? Object.values(plan.tables).reduce((sum, table) => sum + (table.moved ?? 0), 0) : 0;
  return <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><GitMerge className="size-4 text-primary" aria-hidden="true" />{copy('Is this a duplicate?')}</CardTitle><p className="text-sm text-muted-foreground">{copy('Merge it into the place that stays. Its photos, likes, hours and links move there, and its old address forwards.')}</p></CardHeader>
    <CardContent className="space-y-4">
      <PlaceSearchPicker value={into} onChange={(place) => { setInto(place.id === placeId ? null : place); setPlan(null); }} disabled={!canWrite || busy} />
      {plan && <div className="rounded-lg bg-muted p-3 text-sm" role="status">{plan.conflicts.length
        ? <><p className="font-medium text-destructive">{copy('These must be solved first:')}</p><ul className="mt-1 list-disc ps-5">{plan.conflicts.map((conflict, at) => <li key={at}>{typeof conflict === 'string' ? conflict : conflict.message ?? conflict.code}</li>)}</ul></>
        : <p>{moved.toLocaleString(localeFor(lang))} {copy('records move to the place that stays. Nothing conflicts.')}</p>}</div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {canWrite && <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!into || busy} onClick={() => go(true)}>{copy('Show what moves')}</Button>
        <Button variant="destructive" disabled={!plan || plan.conflicts.length > 0 || busy} onClick={() => go(false)}>{copy('Merge into the chosen place')}</Button>
      </div>}
    </CardContent>
  </Card>;
}
