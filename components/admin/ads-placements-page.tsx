'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { AdsPageHeader } from './ads-page-header';
import { AdSurfaceSchematic } from './ad-surface-schematic';
import { RecordCell } from './record-cell';
import { RowActions } from './row-actions';
import { FormActionBar } from './form-action-bar';
import { SectionPlacesDialog } from './section-places-dialog';
import { useDashboardCopy } from './dashboard-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi, toList } from '@/lib/api/admin-client';
import type { AdCampaign, AdInventory, TopPlacesPreview } from '@/lib/api/ads';
import { cairoDate } from '@/lib/api/subscribers';
import { sectionOrder, type HomeSection, type HomePin } from '@/lib/api/storefront';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { ActionDialog, type ActionSpec, Field, LoadingState, RequestError, SavedRefreshError, SubscriberSelect, useSubscriberText } from './subscriber-ui';

export function AdsPlacementsPage({ canWrite = false }: { canWrite?: boolean }) {
  return <React.Suspense fallback={<LoadingState />}><PlacementsContent canWrite={canWrite} /></React.Suspense>;
}

function PlacementsContent({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { pick, lang } = useSubscriberText();
  const params = useSearchParams();
  const router = useRouter();
  const adding = params.get('add') === 'section' && canWrite;
  const today = cairoDate();
  const [managing, setManaging] = React.useState<HomeSection | null>(null);
  const [dragged, setDragged] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [draft, setDraft] = React.useState({ key: '', titleAr: '', titleEn: '', kind: 'featured' as HomeSection['kind'] });
  const number = (value: number) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en').format(value);
  const load = React.useCallback(async () => {
    const [sectionsResponse, capacity, campaignsResponse] = await Promise.all([
      adminApi.get<unknown>('/v1/admin/storefront/sections'),
      adminApi.get<AdInventory>('/v1/admin/ads/inventory', { from: today, to: today }),
      adminApi.get<unknown>('/v1/admin/ads/campaigns', { state: 'live' }),
    ]);
    const sections = toList<HomeSection>(sectionsResponse).items.sort((first, second) => first.sortOrder - second.sortOrder);
    const pins: Record<string, HomePin[]> = {};
    for (const section of sections) pins[section.id] = toList<HomePin>(await adminApi.get<unknown>(`/v1/admin/storefront/sections/${section.id}/places`)).items;
    for (const placement of ['featured', 'top10'] as const) if (!capacity.scopes.some((scope) => scope.placement === placement && scope.cityId === null)) capacity.scopes.unshift({ placement, cityId: null, city: null, days: [] });
    const previews: Record<string, TopPlacesPreview> = {};
    for (const scope of capacity.scopes.filter((scope) => scope.placement === 'top10')) previews[scope.cityId ?? 'all'] = await adminApi.get<TopPlacesPreview>('/v1/admin/ads/top-places/preview', { city: scope.city?.slug });
    return { sections, pins, capacity, campaigns: toList<AdCampaign>(campaignsResponse).items, previews };
  }, [today]);
  const resource = useSubscriberResource(load);
  const sections = resource.data?.sections ?? [];
  const write = async (operation: () => Promise<unknown>) => {
    if (!canWrite || busy || resource.loading || resource.error || resource.savedRefreshFailed) return false;
    setBusy(true); setError('');
    try { await operation(); await resource.refreshAfterSave(); return true; }
    catch { setError(copy('Could not update homepage sections. Refresh before trying again.')); return false; }
    finally { setBusy(false); }
  };
  const reorder = async (source: string, target: string) => {
    if (!canWrite || source === target || busy) return;
    await write(async () => {
      const current = toList<HomeSection>(await adminApi.get<unknown>('/v1/admin/storefront/sections')).items.sort((first, second) => first.sortOrder - second.sortOrder);
      if (JSON.stringify(current.map((section) => [section.id, section.sortOrder])) !== JSON.stringify(sections.map((section) => [section.id, section.sortOrder]))) throw new Error('STALE_ORDER');
      const next = sectionOrder(current, source, target);
      try { for (const section of next) if (current.find((entry) => entry.id === section.id)?.sortOrder !== section.sortOrder) await adminApi.patch(`/v1/admin/storefront/sections/${section.id}`, { sortOrder: section.sortOrder }); }
      catch (caught) { await resource.refetch(); throw caught; }
    });
  };
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || busy) return;
    if (!draft.key.trim() || !draft.titleAr.trim()) { setError(copy('Key and Arabic title are required')); return; }
    setBusy(true); setError('');
    try {
      await adminApi.post('/v1/admin/storefront/sections', { ...draft, titleEn: draft.titleEn || undefined, sortOrder: Math.max(-1, ...sections.map((section) => section.sortOrder)) + 1, enabled: true });
      setDraft({ key: '', titleAr: '', titleEn: '', kind: 'featured' });
      toast.success(copy('Section created.'));
      router.replace('/dashboard/ads/placements');
      await resource.refreshAfterSave();
    } catch { setError(copy('Could not create the section.')); }
    finally { setBusy(false); }
  };
  return <div className="space-y-6">
    <AdsPageHeader title="Where ads appear" description="See booked space and the homepage sections you control." form={adding} actions={[{ label: 'Add a section', href: '/dashboard/ads/placements?add=section#add-section', allowed: canWrite, icon: <Plus className="size-4" aria-hidden="true" /> }]} />
    {error && <RequestError message={error} retry={() => { void resource.refetch(); }} />}
    {resource.loading ? <LoadingState /> : resource.error ? resource.savedRefreshFailed ? <SavedRefreshError retry={() => { void resource.refetch(); }} /> : <RequestError message={copy('Could not load promotion data.')} retry={() => { void resource.refetch(); }} /> : resource.data && <>
      <div className="grid gap-6 xl:grid-cols-2">{resource.data.capacity.scopes.map((scope) => {
        const day = scope.days.find((entry) => entry.date === today);
        const preview = resource.data!.previews[scope.cityId ?? 'all'];
        const campaigns = resource.data!.campaigns.filter((campaign) => campaign.placement === scope.placement && campaign.cityId === scope.cityId);
        return <Card key={`${scope.placement}-${scope.cityId}`}><CardHeader><CardTitle>{copy(scope.placement === 'featured' ? 'Home Featured rail' : 'City Top 10')} · {scope.city ? pick(scope.city.name, scope.city.nameEn) : copy('All Egypt')}</CardTitle></CardHeader><CardContent className="space-y-4">
          <AdSurfaceSchematic surface={scope.placement} />
          {!day && <p className="text-sm tabular-nums">{number(resource.data!.capacity.capacity[scope.placement])} {copy('places of capacity · now')}</p>}
          {day && <p className="text-sm tabular-nums">{number(day.capacity)} {copy('places of capacity')} · {number(day.booked)} {copy('booked today')} · {number(Math.max(0, day.capacity - day.booked))} {copy('free places · today')}</p>}
          <p className="text-sm text-muted-foreground">{copy(scope.placement === 'featured' ? 'Live Featured campaigns; rotation decides who is shown.' : 'Shown in the current Top 10 rotation.')}</p>
          <ul className="divide-y divide-border">{scope.placement === 'top10' && preview ? preview.items.map((item) => <li key={item.place.id} className="flex min-h-14 items-center justify-between gap-3 py-2"><RecordCell nameAr={item.place.name} nameEn={item.place.nameEn} chips={<Badge variant="secondary">{copy(item.sponsored ? 'Sponsored' : 'Not sponsored')}</Badge>} /></li>) : campaigns.map((campaign) => <li key={campaign.id} className="flex min-h-14 items-center justify-between gap-3 py-2"><RecordCell nameAr={campaign.place.name} nameEn={campaign.place.nameEn} chips={<Badge variant="secondary">{copy('Sponsored')}</Badge>} /></li>)}</ul>
          <Button data-ro-allow="true" variant="outline" nativeButton={false} render={<Link href={scope.placement === 'top10' ? `/dashboard/ads/top-10?city=${scope.city?.slug ?? 'all'}` : '/dashboard/ads/campaigns?placement=featured'} />}>{copy('Manage')}</Button>
        </CardContent></Card>;
      })}</div>
      <h2 id="homepage-sections" className="text-lg font-semibold">{copy('Homepage sections')}</h2>
      {!sections.length && <p className="text-sm text-muted-foreground">{copy('No sections yet. Add one to show it on the homepage.')}</p>}
      <div className="grid gap-6 xl:grid-cols-2">{sections.map((section, index) => <Card key={section.id} id={`section-${section.key}`} data-trace-id={`storefront-section-${section.key}`} onDragOver={(event) => { if (canWrite && dragged && !busy) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (dragged) void reorder(dragged, section.id); setDragged(null); }}>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle>{pick(section.titleAr, section.titleEn)}</CardTitle>{canWrite && <div className="flex items-center gap-2"><Button type="button" variant="ghost" size="icon" draggable={!busy} disabled={busy} onDragStart={(event) => { setDragged(section.id); event.dataTransfer.setData('text/plain', section.id); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDragged(null)} aria-label={copy('Drag to reorder; use the menu to move with the keyboard.')}><GripVertical aria-hidden="true" /></Button><RowActions recordName={pick(section.titleAr, section.titleEn)} actions={[
          ...(index > 0 ? [{ label: 'Move up', icon: <ArrowUp aria-hidden="true" />, onClick: () => { void reorder(section.id, sections[index - 1].id); } }] : []),
          ...(index < sections.length - 1 ? [{ label: 'Move down', icon: <ArrowDown aria-hidden="true" />, onClick: () => { void reorder(section.id, sections[index + 1].id); } }] : []),
          { label: 'Edit section', icon: <Pencil aria-hidden="true" />, onClick: () => setAction({ title: copy('Edit section'), fields: [{ name: 'titleAr', label: copy('Title (Arabic)'), value: section.titleAr, required: true }, { name: 'titleEn', label: copy('Title (English)'), value: section.titleEn ?? '' }], submit: async (values) => { if (!await write(() => adminApi.patch(`/v1/admin/storefront/sections/${section.id}`, { titleAr: values.titleAr, titleEn: values.titleEn || null }))) throw new Error(copy('Could not update homepage sections. Refresh before trying again.')); } }) },
          { label: section.enabled ? 'Disable section' : 'Enable section', icon: <Eye aria-hidden="true" />, onClick: () => { void write(() => adminApi.patch(`/v1/admin/storefront/sections/${section.id}`, { enabled: !section.enabled })); } },
          { label: 'Delete section', icon: <Trash2 aria-hidden="true" />, destructive: true, onClick: () => setAction({ title: copy('Delete section?'), description: copy('This removes the homepage section and its pins, not the places.'), destructive: true, submit: async () => { if (!await write(() => adminApi.delete(`/v1/admin/storefront/sections/${section.id}`))) throw new Error(copy('Could not update homepage sections. Refresh before trying again.')); } }) },
        ].map((item) => ({ ...item, disabled: busy || resource.loading || Boolean(resource.error) || resource.savedRefreshFailed }))} /></div>}</CardHeader>
        <CardContent className="space-y-4"><AdSurfaceSchematic surface="section" /><Badge variant="secondary">{copy(section.enabled ? 'Enabled' : 'Disabled')}</Badge><p className="text-sm tabular-nums">{number(resource.data!.pins[section.id].length)} {copy('configured pins · now')}</p><p className="text-sm text-muted-foreground">{copy('Pins are editorial, not paid campaigns. Empty automatic sections fill by their kind.')}</p>
          <ul className="divide-y divide-border">{resource.data!.pins[section.id].map((place) => <li key={place.id} className="min-h-14 py-2"><RecordCell nameAr={place.name} nameEn={place.nameEn} chips={<Badge variant="secondary">{copy('Not sponsored')}</Badge>} /></li>)}</ul>
          <Button data-ro-allow="true" variant="outline" onClick={() => setManaging(section)} data-trace-id={`storefront-manage-${section.key}`}>{copy('Manage')}</Button>
        </CardContent></Card>)}</div>
    </>}
    {adding && <Card id="add-section"><CardHeader><CardTitle>{copy('Add a section')}</CardTitle></CardHeader><CardContent><form id="home-section-form" onSubmit={create} noValidate className="space-y-5"><fieldset disabled={busy || resource.loading || Boolean(resource.error)} className="grid gap-4 sm:grid-cols-2">
      <Field label={copy('Key (slug)')}><Input value={draft.key} onChange={(event) => setDraft({ ...draft, key: event.target.value })} required /></Field>
      <Field label={copy('Kind')}><SubscriberSelect value={draft.kind} options={['featured', 'top_rated', 'recommended', 'custom'].map((value) => ({ value, label: copy({ featured: 'Featured', top_rated: 'Top rated', recommended: 'Recommended', custom: 'Custom (pinned)' }[value]!) }))} onValueChange={(kind) => setDraft({ ...draft, kind: kind as HomeSection['kind'] })} /></Field>
      <Field label={copy('Title (Arabic)')}><Input dir="rtl" value={draft.titleAr} onChange={(event) => setDraft({ ...draft, titleAr: event.target.value })} required /></Field>
      <Field label={copy('Title (English)')}><Input dir="ltr" value={draft.titleEn} onChange={(event) => setDraft({ ...draft, titleEn: event.target.value })} /></Field>
    </fieldset><FormActionBar form="home-section-form" dirty={Boolean(draft.key || draft.titleAr || draft.titleEn || draft.kind !== 'featured')} saving={busy} error={error} disabled={resource.loading || Boolean(resource.error)} cancelHref="/dashboard/ads/placements" primaryLabel={copy('Create section')} /></form></CardContent></Card>}
    <SectionPlacesDialog canWrite={canWrite} sectionId={managing?.id ?? null} sectionTitle={managing ? pick(managing.titleAr, managing.titleEn) : null} open={Boolean(managing)} onOpenChange={(open) => { if (!open) setManaging(null); }} onSaved={() => { void resource.refreshAfterSave(); }} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}
