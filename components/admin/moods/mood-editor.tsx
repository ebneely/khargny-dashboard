'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { IconPreview, lucideByName } from '@/components/icon-picker';
import { Field } from '../subscriber-ui';
import { useDashboardCopy } from '../dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { moodsApi, type Mood, type MoodInput, type MoodWeights } from '@/lib/api/moods';
import { MOOD_ACCENTS, MOOD_ICONS, nextWeight } from '@/lib/mood-tokens';
import { useAdminTags } from '@/lib/api/hooks/use-admin-tags';
import { useAdminAmenities } from '@/lib/api/hooks/use-admin-amenities';
import { useAdminCategories } from '@/lib/api/hooks/use-admin-categories';
import { MoodPreview } from './mood-preview';
import { cn } from '@/lib/utils';

type Item = { id: string; ar: string; en: string | null };

const emptyWeights = (): MoodWeights => ({ tags: {}, amenities: {}, categories: {} });

const slugOf = (name: string) =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/**
 * One mood, edited in one place: names, look and weights, with the city's top ten beside
 * them. A chip's number is its weight (0-3); tapping it moves to the next level. The form is
 * keyed by the mood, so opening a different one starts from that mood with no effect.
 */
export function MoodEditor({ mood, cityId, open, onOpenChange, onSaved, canWrite }: { mood: Mood | 'new' | null; cityId: string; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void; canWrite: boolean }) {
  const copy = useDashboardCopy();
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full! gap-0 p-0 sm:max-w-2xl">
      <SheetHeader className="border-b px-6 py-4 pe-12 rtl:ps-12 rtl:pe-6">
        <SheetTitle>{copy(mood === 'new' ? 'New mood' : 'Edit mood')}</SheetTitle>
        <SheetDescription>{copy('Names, look and weights. The preview follows what you type before you save.')}</SheetDescription>
      </SheetHeader>
      {open && mood && <MoodForm key={mood === 'new' ? 'new' : mood.id} mood={mood} cityId={cityId} canWrite={canWrite} onSaved={onSaved} onClose={() => onOpenChange(false)} />}
    </SheetContent>
  </Sheet>;
}

function MoodForm({ mood, cityId, canWrite, onSaved, onClose }: { mood: Mood | 'new'; cityId: string; canWrite: boolean; onSaved: () => void; onClose: () => void }) {
  const copy = useDashboardCopy();
  const creating = mood === 'new';
  const source = creating ? null : mood;
  const [draft, setDraft] = React.useState<MoodInput>(() => source
    ? { slug: source.slug, nameEn: source.nameEn, nameAr: source.nameAr, icon: source.icon, accent: source.accent, enabled: source.enabled }
    : { nameEn: '', nameAr: '', icon: 'sparkles', accent: 'accent', enabled: true });
  const [weights, setWeights] = React.useState<MoodWeights>(() => source
    ? { tags: { ...source.weights.tags }, amenities: { ...source.weights.amenities }, categories: { ...source.weights.categories } }
    : emptyWeights());
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const tags = useAdminTags();
  const amenities = useAdminAmenities();
  const categories = useAdminCategories();

  const icon = draft.icon ?? 'sparkles';
  const accent = draft.accent ?? 'accent';
  const slug = (draft.slug ?? '').trim() || slugOf(draft.nameEn ?? '');
  const ready = Boolean(draft.nameEn?.trim() && draft.nameAr?.trim() && slug);

  const cycle = (kind: keyof MoodWeights, id: string) =>
    setWeights((current) => {
      const next = nextWeight(current[kind][id] ?? 0);
      const part = { ...current[kind] };
      if (next === 0) delete part[id];
      else part[id] = next;
      return { ...current, [kind]: part };
    });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || busy || !ready) return;
    setBusy(true);
    setError('');
    try {
      const body: MoodInput = { ...draft, slug, weights };
      if (source) await moodsApi.update(source.id, body);
      else await moodsApi.create(body);
      toast.success(copy('Saved. Live on the app and the website now.'));
      onSaved();
      onClose();
    } catch {
      setError(copy('Could not save the mood.'));
    } finally {
      setBusy(false);
    }
  };

  const groups: { kind: keyof MoodWeights; title: string; items: Item[]; loading: boolean }[] = [
    { kind: 'tags', title: 'Tags', loading: tags.isLoading, items: (tags.data ?? []).map((tag) => ({ id: tag.id, ar: tag.name, en: tag.nameEn })) },
    { kind: 'amenities', title: 'Amenities', loading: amenities.isLoading, items: (amenities.data ?? []).map((amenity) => ({ id: amenity.id, ar: amenity.name, en: amenity.nameEn })) },
    { kind: 'categories', title: 'Categories', loading: categories.isLoading, items: (categories.data ?? []).map((category) => ({ id: category.id, ar: category.nameAr, en: category.nameEn })) },
  ];

  return <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5 pb-8">
      <section className="space-y-3">
        <h3 className="font-semibold">{copy('Names')}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={copy('English name')} required><Input value={draft.nameEn ?? ''} onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })} disabled={!canWrite} dir="ltr" /></Field>
          <Field label={copy('Arabic name')} required><Input value={draft.nameAr ?? ''} onChange={(event) => setDraft({ ...draft, nameAr: event.target.value })} disabled={!canWrite} dir="rtl" /></Field>
          <Field label={copy('Public link')} optional><Input value={slug} onChange={(event) => setDraft({ ...draft, slug: slugOf(event.target.value) })} disabled={!canWrite} dir="ltr" /></Field>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">{copy('Look')}</h3>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={copy('Icon')}>
          {MOOD_ICONS.map((entry) => {
            const Glyph = lucideByName(entry.value);
            const chosen = icon === entry.value;
            return <Button key={entry.value} type="button" size="icon-sm" variant={chosen ? 'default' : 'outline'} aria-pressed={chosen} aria-label={copy(entry.label)} title={copy(entry.label)} disabled={!canWrite} onClick={() => setDraft({ ...draft, icon: entry.value })}>{Glyph ? <Glyph size={16} /> : <IconPreview name={entry.value} size={16} />}</Button>;
          })}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={copy('Accent')}>
          {MOOD_ACCENTS.map((entry) => <button key={entry.value} type="button" aria-pressed={accent === entry.value} aria-label={copy(entry.label)} title={copy(entry.label)} disabled={!canWrite} onClick={() => setDraft({ ...draft, accent: entry.value })} className={cn('grid size-6 place-items-center rounded-full border-2 transition-transform', entry.dot, accent === entry.value ? 'scale-110 border-foreground' : 'border-transparent opacity-80 hover:opacity-100')} />)}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">{copy('Weights')}</h3>
          <p className="text-sm text-muted-foreground">{copy('Tap a chip to set its weight: off, then 1, 2 and 3. The number on the chip is the weight.')}</p>
        </div>
        {groups.map((group) => <WeightGroup key={group.kind} title={group.title} kind={group.kind} items={group.items} loading={group.loading} weights={weights[group.kind]} disabled={!canWrite} onCycle={cycle} />)}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">{copy('Top 10 places')}</h3>
          <p className="text-sm text-muted-foreground">{copy('Live preview follows your unsaved weights.')}</p>
        </div>
        {source ? <MoodPreview moodId={source.id} cityId={cityId} accent={accent} weights={weights} compact /> : <p className="text-sm text-muted-foreground">{copy('Save this mood to see its top places.')}</p>}
      </section>
    </div>
    <div className="flex items-center justify-between gap-3 border-t bg-popover px-6 py-3">
      <p className="min-w-0 text-sm text-destructive" role={error ? 'alert' : undefined}>{error}</p>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>{copy('Cancel')}</Button>
        <Button type="submit" disabled={!canWrite || busy || !ready}>{copy(creating ? 'Create mood' : 'Save')}</Button>
      </div>
    </div>
  </form>;
}

function WeightGroup({ title, kind, items, loading, weights, disabled, onCycle }: { title: string; kind: keyof MoodWeights; items: Item[]; loading: boolean; weights: Record<string, number>; disabled: boolean; onCycle: (kind: keyof MoodWeights, id: string) => void }) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  const [search, setSearch] = React.useState('');
  const text = search.trim().toLowerCase();
  const shown = text ? items.filter((item) => `${item.ar} ${item.en ?? ''}`.toLowerCase().includes(text)) : items;
  const chosen = items.filter((item) => (weights[item.id] ?? 0) > 0);
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="text-sm font-semibold">{copy(title)} <span className="font-normal tabular-nums text-muted-foreground">({chosen.length})</span></h4>
      <label className="relative block min-w-0">
        <Search className="pointer-events-none absolute start-2.5 top-2.5 size-3.5 text-muted-foreground" aria-hidden="true" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy('Search')} aria-label={`${copy('Search')} ${copy(title)}`} className="h-8 w-48 ps-8 text-sm" />
      </label>
    </div>
    {loading ? <div className="h-10 animate-pulse rounded bg-muted" aria-busy="true" /> : <div className="flex flex-wrap gap-1.5">
      {shown.map((item) => {
        const level = weights[item.id] ?? 0;
        return <button key={item.id} type="button" disabled={disabled} aria-pressed={level > 0} aria-label={`${pick(item.ar, item.en)}, ${copy('weight')} ${level}`} title={`${pick(item.ar, item.en)} · ${level}`} onClick={() => onCycle(kind, item.id)} className={cn('inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors', level > 0 ? 'border-primary bg-primary/10 font-medium text-foreground' : 'border-border bg-background text-muted-foreground hover:text-foreground')}>
          <span dir="auto">{pick(item.ar, item.en)}</span>
          <span className={cn('grid size-4 place-items-center rounded-full text-[11px] tabular-nums', level > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{level}</span>
        </button>;
      })}
      {!shown.length && <p className="text-sm text-muted-foreground">{copy('No matches.')}</p>}
    </div>}
  </div>;
}
