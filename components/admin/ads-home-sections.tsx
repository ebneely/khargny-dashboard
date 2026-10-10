'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowDown, ArrowUp, GripVertical, Pencil, Pin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RecordList, RecordRow } from './record-list';
import { RecordCell } from './record-cell';
import { RowActions } from './row-actions';
import { FormActionBar } from './form-action-bar';
import { SectionPlacesDialog } from './section-places-dialog';
import { useDashboardCopy } from './dashboard-text';
import { ActionDialog, Field, LoadingState, RequestError, SavedRefreshError, SubscriberSelect, type ActionSpec } from './subscriber-ui';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { adminApi, toList } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import type { HomeSection } from '@/lib/api/storefront';
import { adsError, reorderPayload } from '@/lib/ads-round7b';
import { adsBApi } from '@/lib/api/ads-round-b';

type CommercialSection = HomeSection & { promotionKind: 'editorial' | 'paid' };
export function HomeSections({ canWrite }: { canWrite: boolean }) { return <React.Suspense fallback={<LoadingState />}><SectionsContent canWrite={canWrite} /></React.Suspense>; }
function SectionsContent({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy(); const { pick } = useDashboardLang(); const params = useSearchParams();
  const adding = canWrite && params.get('add') === 'section';
  const [dragged, setDragged] = React.useState<string | null>(null); const [managing, setManaging] = React.useState<CommercialSection | null>(null);
  const [busy, setBusy] = React.useState(false); const writing = React.useRef(false); const [error, setError] = React.useState(''); const [stale, setStale] = React.useState(false);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [draft, setDraft] = React.useState({ key: '', titleAr: '', titleEn: '', kind: 'featured', promotionKind: 'editorial' });
  const load = React.useCallback(async () => toList<CommercialSection>(await adminApi.get('/v1/admin/storefront/sections')).items.sort((first, second) => first.sortOrder - second.sortOrder || first.id.localeCompare(second.id)), []);
  const resource = useSubscriberResource(load); const sections = resource.data ?? [];
  const locked = !canWrite || busy || resource.loading || Boolean(resource.error) || resource.savedRefreshFailed || stale;
  const write = async (operation: () => Promise<unknown>, reordering = false) => {
    if (locked || writing.current) return false;
    writing.current = true; setBusy(true); setError('');
    try { await operation(); const refreshed = await resource.refreshAfterSave(); if (refreshed) toast.success(copy('Saved. Live on the website now.')); return true; }
    catch (caught) { setError(copy(adsError(caught, reordering ? 'reorder' : undefined))); if (reordering && (caught as { status?: number }).status === 409) setStale(true); return false; }
    finally { writing.current = false; setBusy(false); }
  };
  const move = (source: string, target: string) => { if (source !== target) void write(() => adsBApi.reorderSections(reorderPayload(sections.map(row => row.id), source, target)), true); };
  return <>
    <Card id="homepage-sections"><CardHeader><CardTitle>{copy('Homepage sections')}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{copy('Drag a section or use Move up and Move down. The whole order is saved together. Changes are live at once.')}</p>
      {resource.savedRefreshFailed && <SavedRefreshError retry={() => { void resource.refetch(); }} />}
      {error && <RequestError message={error} retry={() => { void resource.refetch().then(ok => { if (ok) { setStale(false); setError(''); } }); }} />}
      {resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load homepage sections.')} retry={() => { void resource.refetch(); }} /> : <RecordList scope="home-sections" records={sections} searchText={row => `${row.titleAr} ${row.titleEn ?? ''} ${row.key}`} filters={[{ key: 'commercial', label: 'Commercial kind', options: [{ value: 'paid', label: 'Paid' }, { value: 'editorial', label: 'Editorial' }], value: row => row.promotionKind ?? 'editorial' }]} render={visible => <div>{visible.map(section => {
        const position = sections.findIndex(row => row.id === section.id); const title = pick(section.titleAr, section.titleEn);
        return <div key={section.id} draggable={!locked} onDragStart={() => setDragged(section.id)} onDragOver={event => { if (!locked) event.preventDefault(); }} onDrop={event => { event.preventDefault(); if (dragged && !locked) move(dragged, section.id); setDragged(null); }} onDragEnd={() => setDragged(null)} className="min-h-14 border-b py-2">
          <RecordRow align="center" actions={canWrite && <RowActions recordName={title} actions={[
            { label: 'Edit section', icon: <Pencil />, disabled: locked, onClick: () => setAction({ title: copy('Edit section'), fields: [{ name: 'titleAr', label: copy('Title (Arabic) *'), value: section.titleAr, required: true }, { name: 'titleEn', label: copy('Title (English)'), value: section.titleEn ?? '' }, { name: 'promotionKind', label: copy('Commercial kind'), type: 'select', value: section.promotionKind ?? 'editorial', options: [{ value: 'editorial', label: copy('Editorial') }, { value: 'paid', label: copy('Paid') }] }], submit: async values => { const ok = await write(() => adminApi.patch(`/v1/admin/storefront/sections/${section.id}`, values)); if (!ok) throw new Error(copy('Could not update homepage sections.')); } }) },
            { label: 'Move up', icon: <ArrowUp />, disabled: locked || position === 0, onClick: () => move(section.id, sections[position - 1].id) },
            { label: 'Move down', icon: <ArrowDown />, disabled: locked || position === sections.length - 1, onClick: () => move(section.id, sections[position + 1].id) },
            { label: 'Manage places', icon: <Pin />, disabled: locked, onClick: () => setManaging(section) },
            { label: section.enabled ? 'Disable section' : 'Enable section', icon: <Pencil />, disabled: locked, onClick: () => setAction({ title: copy(section.enabled ? 'Disable section?' : 'Enable section?'), description: copy('This changes whether the section appears to visitors.'), submit: async () => { if (!await write(() => adminApi.patch(`/v1/admin/storefront/sections/${section.id}`, { enabled: !section.enabled }))) throw new Error(copy('Could not update homepage sections.')); } }) },
            { label: 'Delete section', icon: <Trash2 />, destructive: true, disabled: locked, onClick: () => setAction({ title: copy('Delete section?'), description: copy('This permanently removes the section and its pins. Its section campaigns are removed too. The places remain.'), destructive: true, submit: async () => { if (!await write(() => adminApi.delete(`/v1/admin/storefront/sections/${section.id}`))) throw new Error(copy('Could not update homepage sections.')); } }) },
          ]} />}><div className="flex min-w-0 items-center gap-2"><span data-slot="section-drag-handle" className="shrink-0 cursor-grab"><GripVertical className="size-4 text-muted-foreground" aria-hidden="true" /></span><div className="min-w-0 flex-1"><RecordCell icon="section" nameAr={section.titleAr} nameEn={section.titleEn} chips={<Badge variant="secondary">{copy(section.promotionKind === 'paid' ? 'Paid' : 'Editorial')}</Badge>} context={`${position + 1} · ${copy(section.enabled ? 'Enabled' : 'Disabled')}`} /></div></div></RecordRow>
        </div>;
      })}</div>} />}
    </CardContent></Card>
    {adding && <Card><CardHeader><CardTitle>{copy('Add a section')}</CardTitle></CardHeader><CardContent><form id="section-create" className="grid gap-4 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void write(() => adminApi.post('/v1/admin/storefront/sections', draft)).then(ok => { if (ok) window.history.replaceState(null, '', '/dashboard/ads/placements#homepage-sections'); }); }}><Field label={copy('Key *')}><Input value={draft.key} onChange={event => setDraft({ ...draft, key: event.target.value })} required disabled={locked} /></Field><Field label={copy('Kind *')}><SubscriberSelect value={draft.kind} disabled={locked} onValueChange={kind => setDraft({ ...draft, kind })} options={['featured', 'top_rated', 'recommended', 'custom'].map((value, index) => ({ value, label: copy(['Featured', 'Top rated', 'Recommended', 'Custom (pinned)'][index]) }))} /></Field><Field label={copy('Title (Arabic) *')}><Input value={draft.titleAr} onChange={event => setDraft({ ...draft, titleAr: event.target.value })} required disabled={locked} /></Field><Field label={copy('Title (English)')}><Input value={draft.titleEn} onChange={event => setDraft({ ...draft, titleEn: event.target.value })} disabled={locked} /></Field><Field label={copy('Commercial kind')}><SubscriberSelect value={draft.promotionKind} disabled={locked} onValueChange={promotionKind => setDraft({ ...draft, promotionKind })} options={[{ value: 'editorial', label: copy('Editorial') }, { value: 'paid', label: copy('Paid') }]} /></Field><FormActionBar creating dirty={Boolean(draft.key || draft.titleAr)} saving={busy} error={error} disabled={locked} form="section-create" primaryLabel={copy('Create section')} cancelHref="/dashboard/ads/placements" /></form></CardContent></Card>}
    <SectionPlacesDialog canWrite={canWrite} sectionId={managing?.id ?? null} sectionTitle={managing ? pick(managing.titleAr, managing.titleEn) : null} open={Boolean(managing)} onOpenChange={open => { if (!open) setManaging(null); }} onSaved={() => { void resource.refreshAfterSave(); }} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </>;
}
