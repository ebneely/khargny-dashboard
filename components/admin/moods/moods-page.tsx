'use client';

import * as React from 'react';
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RowActions } from '../row-actions';
import { RecordList, RecordRow } from '../record-list';
import { ActionDialog, LoadingState, RequestError, SavedRefreshError, SubscriberSelect, type ActionSpec } from '../subscriber-ui';
import { useDashboardCopy } from '../dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { useAdminCities } from '@/lib/api/hooks/use-admin-cities';
import { moodsApi, type Mood } from '@/lib/api/moods';
import { accentOf, moodIconName } from '@/lib/mood-tokens';
import { IconPreview } from '@/components/icon-picker';
import { MoodEditor } from './mood-editor';
import { MoodPreview } from './mood-preview';
import { cn } from '@/lib/utils';

/**
 * Moods (PLACES-DIRECTION §5): the eight recommended moods, their order, their look and the
 * weighted tags, amenities and categories each one is built from. The app and the website
 * read this page, so a change here is live for both.
 */
export function MoodsPage({ canWrite }: { canWrite: boolean }) {
  return <React.Suspense fallback={<LoadingState />}><MoodsContent canWrite={canWrite} /></React.Suspense>;
}

function MoodsContent({ canWrite }: { canWrite: boolean }) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  const load = React.useCallback(async () => (await moodsApi.list()).data, []);
  const resource = useSubscriberResource(load);
  const moods = React.useMemo(() => [...(resource.data ?? [])].sort((a, b) => a.sort - b.sort || a.slug.localeCompare(b.slug)), [resource.data]);
  const cities = useAdminCities({ status: 'active' }, true);
  const [cityId, setCityId] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Mood | 'new' | null>(null);
  const [dragged, setDragged] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const writing = React.useRef(false);

  const selected = moods.find((mood) => mood.id === selectedId) ?? moods[0] ?? null;
  const locked = !canWrite || busy || resource.loading || Boolean(resource.error);

  const write = async (operation: () => Promise<unknown>) => {
    if (locked || writing.current) return false;
    writing.current = true; setBusy(true); setError('');
    try {
      await operation();
      const refreshed = await resource.refreshAfterSave();
      if (refreshed) toast.success(copy('Saved. Live on the app and the website now.'));
      return true;
    } catch {
      setError(copy('Could not save the mood.'));
      return false;
    } finally { writing.current = false; setBusy(false); }
  };

  const move = (source: string, target: string) => {
    if (source === target) return;
    const order = moods.map((mood) => mood.id);
    const from = order.indexOf(source); const to = order.indexOf(target);
    if (from < 0 || to < 0) return;
    order.splice(to, 0, order.splice(from, 1)[0]);
    void write(() => moodsApi.reorder(order));
  };

  const cityOptions = [{ value: '', label: copy('All cities') }, ...((cities.data?.items ?? []).map((city) => ({ value: city.id, label: pick(city.name, city.nameEn) })))];

  return <div className="min-w-0 space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold">{copy('Moods')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{copy('What people are in the mood for. The row, the icons and the weights the app and the website rank by.')}</p>
      </div>
      <Button type="button" size="sm" disabled={!canWrite} onClick={() => setEditing('new')}><Plus aria-hidden="true" />{copy('New mood')}</Button>
    </header>

    {resource.savedRefreshFailed && <SavedRefreshError retry={() => { void resource.refetch(); }} />}
    {error && <RequestError message={error} retry={() => { void resource.refetch(); }} />}

    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
      <Card>
        <CardHeader><CardTitle>{copy('The mood row')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{copy('The order here is the order on the app and the website. Drag a mood or use Move up and Move down.')}</p>
          {resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load moods.')} retry={() => { void resource.refetch(); }} /> : (
            <RecordList scope="moods" records={moods} searchText={(mood) => `${mood.nameEn} ${mood.nameAr} ${mood.slug}`} render={(visible) => <div>{visible.map((mood) => {
              const position = moods.findIndex((row) => row.id === mood.id);
              const tone = accentOf(mood.accent);
              return <div key={mood.id} draggable={!locked} onDragStart={() => setDragged(mood.id)} onDragOver={(event) => { if (!locked) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); if (dragged && !locked) move(dragged, mood.id); setDragged(null); }} onDragEnd={() => setDragged(null)} className="min-h-14 border-b py-2">
                <RecordRow align="center" actions={canWrite && <RowActions recordName={pick(mood.nameAr, mood.nameEn)} actions={[
                  { label: 'Edit mood', icon: <Pencil />, disabled: locked, onClick: () => setEditing(mood) },
                  { label: 'Move up', icon: <ArrowUp />, disabled: locked || position === 0, onClick: () => move(mood.id, moods[position - 1].id) },
                  { label: 'Move down', icon: <ArrowDown />, disabled: locked || position === moods.length - 1, onClick: () => move(mood.id, moods[position + 1].id) },
                  { label: mood.enabled ? 'Hide mood' : 'Show mood', icon: <Pencil />, disabled: locked, onClick: () => { void write(() => moodsApi.update(mood.id, { enabled: !mood.enabled })); } },
                  { label: 'Delete mood', icon: <Pencil />, destructive: true, disabled: locked, onClick: () => setAction({ title: copy('Delete mood?'), description: copy('This removes the mood from the app and the website. The places and their tags stay.'), destructive: true, submit: async () => { if (!await write(() => moodsApi.remove(mood.id))) throw new Error(copy('Could not save the mood.')); } }) },
                ]} />}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span data-slot="mood-drag-handle" className={cn('shrink-0', locked ? 'cursor-default' : 'cursor-grab')}><GripVertical className="size-4 text-muted-foreground" aria-hidden="true" /></span>
                    <button type="button" onClick={() => setSelectedId(mood.id)} aria-pressed={selected?.id === mood.id} title={copy('Show this mood in the preview')} className={cn('grid size-10 shrink-0 place-items-center rounded-[10px] transition-shadow', tone.chip, selected?.id === mood.id && 'ring-2 ring-ring ring-offset-1 ring-offset-background')}>
                      <IconPreview name={moodIconName(mood.icon)} size={18} />
                      <span className="sr-only">{copy('Preview')}</span>
                    </button>
                    <div className="min-w-0">
                      <p className="truncate text-start font-medium" title={pick(mood.nameAr, mood.nameEn)}><span dir="auto">{pick(mood.nameAr, mood.nameEn)}</span></p>
                      <p className="truncate text-start text-sm text-muted-foreground" title={pick(mood.nameEn, mood.nameAr)}><span dir="auto">{pick(mood.nameEn, mood.nameAr)}</span></p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="tabular-nums">{mood.weightCount} {copy('weights')}</Badge>
                        <Badge variant={mood.enabled ? 'secondary' : 'outline'}>{copy(mood.enabled ? 'Shown' : 'Hidden')}</Badge>
                        <span className="text-xs text-muted-foreground" dir="ltr">{mood.slug}</span>
                      </div>
                    </div>
                  </div>
                </RecordRow>
              </div>;
            })}</div>} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{copy('Top 10 places')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{copy('The city’s first ten for the chosen mood, by fit. A place with fit 0 still appears, last.')}</p>
          <div className="max-w-xs"><SubscriberSelect value={cityId} options={cityOptions} onValueChange={setCityId} aria-label={copy('City')} /></div>
          {selected ? <><p className="text-sm"><span className="font-medium">{pick(selected.nameAr, selected.nameEn)}</span> <span className="text-muted-foreground">· {copy('in')} {cityOptions.find((option) => option.value === cityId)?.label ?? copy('All cities')}</span></p>
            <MoodPreview moodId={selected.id} cityId={cityId} accent={selected.accent} />
          </> : <p className="text-sm text-muted-foreground">{copy('Add a mood to see its top places.')}</p>}
        </CardContent>
      </Card>
    </div>

    <MoodEditor mood={editing} cityId={cityId} open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }} canWrite={canWrite} onSaved={() => { void resource.refetch(); }} />
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}
