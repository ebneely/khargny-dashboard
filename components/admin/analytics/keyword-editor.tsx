'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { KEYWORD_GROUPS, type KeywordConcept, type KeywordGroup } from '@/lib/api/search-insights';
import { useFormChanges } from '@/lib/use-form-changes';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { useDashboardCopy } from '../dashboard-text';
import { FormActionBar } from '../form-action-bar';
import { Field, SubscriberSelect } from '../subscriber-ui';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';

export const GROUP_LABELS: Record<KeywordGroup, string> = { cuisine: 'Cuisine', vibe: 'Vibe', occasion: 'Occasion', activity: 'Activity', audience: 'Audience', feature: 'Feature', price: 'Price', other: 'Other' };

export function KeywordEditor({ keyword, disabled, onSaved }: { keyword?: KeywordConcept; disabled?: boolean; onSaved?: () => Promise<boolean> }) {
  const copy = useDashboardCopy();
  const router = useRouter();
  const params = useSearchParams();
  const readOnly = useDashboardReadOnly();
  const formId = React.useId();
  const original = React.useMemo(() => ({ name: keyword?.name ?? '', nameEn: keyword?.nameEn ?? '', group: keyword?.group ?? 'other' as KeywordGroup, aliases: keyword?.aliases ?? [], notes: keyword?.notes ?? '' }), [keyword]);
  const [draft, setDraft] = React.useState(() => keyword ? original : { ...original, name: params.get('prefill') ?? '' });
  const [spelling, setSpelling] = React.useState('');
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const submitting = React.useRef(false);
  const [refreshFailed, setRefreshFailed] = React.useState(false);
  const changes = useFormChanges(draft, original);
  if (readOnly) return <div className="space-y-3"><p className="text-sm text-muted-foreground">{copy('Read only: viewers cannot change keywords or decisions.')}</p><p>{keyword?.name} · {keyword?.nameEn}</p><p>{copy(GROUP_LABELS[draft.group])}</p><p className="break-words">{keyword?.aliases.join(' · ')}</p><p className="whitespace-pre-wrap break-words">{keyword?.notes}</p></div>;
  const addSpelling = () => {
    const value = spelling.trim();
    if (!value || value.length > 40 || draft.aliases.length >= 30) { setError(copy('Use up to 30 spellings, each between 1 and 40 characters.')); return; }
    if ([draft.name, draft.nameEn, ...draft.aliases].some((existing) => existing.trim().toLocaleLowerCase() === value.toLocaleLowerCase())) { setError(copy('This spelling is already included.')); return; }
    setDraft({ ...draft, aliases: [...draft.aliases, value] }); setSpelling(''); setError('');
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting.current || busy || disabled || refreshFailed || !changes.dirty || readOnly) return;
    if (!draft.name.trim() || draft.name.trim().length > 40 || draft.nameEn.trim().length > 40 || draft.notes.length > 2000 || spelling.trim()) { setError(copy('Check names and notes, and add or clear the pending spelling.')); return; }
    submitting.current = true; setBusy(true); setError('');
    const payload = { name: draft.name.trim(), nameEn: draft.nameEn.trim() || null, group: draft.group, aliases: draft.aliases, notes: draft.notes.trim() || null };
    try {
      const result = keyword ? await adminApi.patch<KeywordConcept>(`/v1/admin/tags/${keyword.id}`, payload) : await adminApi.post<KeywordConcept>('/v1/admin/tags', payload);
      changes.markSaved();
      if (keyword && onSaved) { if (!await onSaved()) setRefreshFailed(true); else toast.success(copy('Keyword saved')); }
      else { toast.success(copy('Keyword saved')); router.push(`/dashboard/tags/${result.id}?${params}`); }
    } catch (caught) { setError(copy(caught instanceof AdminApiError && caught.status === 409 ? 'A name or spelling belongs to another keyword. Review the names and spellings.' : 'Could not save keyword. Your edits are kept.')); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <form id={formId} onSubmit={save} noValidate className="space-y-4"><fieldset disabled={busy || disabled || refreshFailed} className="grid min-w-0 gap-4 sm:grid-cols-2">
    <Field label={copy('Name (Arabic)')}><Input dir="rtl" value={draft.name} maxLength={40} required onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
    <Field label={copy('Name (English) — optional')}><Input dir="ltr" value={draft.nameEn} maxLength={40} onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })} /></Field>
    <Field label={copy('Keyword group')}><SubscriberSelect value={draft.group} options={KEYWORD_GROUPS.map((group) => ({ value: group, label: copy(GROUP_LABELS[group]) }))} onValueChange={(group) => setDraft({ ...draft, group: group as KeywordGroup })} /></Field>
    <div className="space-y-2 sm:col-span-2"><label htmlFor={`${formId}-spelling`} className="text-sm font-medium">{copy('Spellings')}</label><div className="flex flex-wrap gap-2"><Input id={`${formId}-spelling`} value={spelling} maxLength={40} className="min-w-0 flex-1" onChange={(event) => setSpelling(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addSpelling(); } }} /><Button type="button" variant="outline" onClick={addSpelling}>{copy('Add spelling')}</Button></div><div className="flex flex-wrap gap-2">{draft.aliases.map((alias) => <Button type="button" key={alias} variant="outline" className="max-w-full whitespace-normal break-words rounded-full" aria-label={`${copy('Remove spelling')}: ${alias}`} onClick={() => setDraft({ ...draft, aliases: draft.aliases.filter((value) => value !== alias) })}>{alias} ×</Button>)}</div><p className="text-sm text-muted-foreground">{copy('Spellings are hidden search words, not public labels.')}</p></div>
    <div className="sm:col-span-2"><Field label={copy('Internal notes — optional')}><textarea className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm focus-visible:outline-ring" value={draft.notes} maxLength={2000} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></Field></div>
  </fieldset>{refreshFailed && <p role="alert" className="text-sm text-destructive">{copy('Saved, but could not refresh. Reload before changing anything else.')}</p>}
    <FormActionBar creating={!keyword && !changes.saved} form={formId} dirty={changes.dirty} saving={busy} error={error} disabled={disabled || refreshFailed} disabledReason={refreshFailed ? copy('Saved, but could not refresh. Reload before changing anything else.') : undefined} cancelHref={`/dashboard/tags?${params}`} primaryLabel={copy(keyword ? 'Save keyword' : 'Create keyword')} />
  </form>;
}
