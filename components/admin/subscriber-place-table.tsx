'use client';

import * as React from 'react';
import { RecordCell } from './record-cell';
import { Pager } from './pager';
import { useUrlTab } from '@/lib/use-url-tab';
import { placeCover, placeOwner } from '@/lib/place-list';
import { Check, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from './segmented-control';
import { adminApi, toList } from '@/lib/api/admin-client';
import type { SubscriberPlace } from '@/lib/api/subscribers';
import { StatusBadge, useSubscriberText } from './subscriber-ui';

export type LinkedPlaceRow = SubscriberPlace & {
  coverImage?: string | null;
  images?: { url: string; urls?: { small?: string } }[];
  city?: { name: string; nameEn?: string | null };
  category?: { nameAr: string; nameEn?: string | null };
  subscriberId?: string | null;
  subscriber?: { id: string; name?: string } | null;
};

export function linkedToAnother(place: LinkedPlaceRow, subscriberId?: string) {
  const owner = placeOwner(place)?.id;
  return Boolean(owner && owner !== subscriberId);
}

type SubscriberPlaceTableProps = {
  value: SubscriberPlace[];
  persisted?: SubscriberPlace[];
  onChange: (places: SubscriberPlace[]) => void;
  subscriberId?: string;
  disabled?: boolean;
  readOnly?: boolean;
};

export function SubscriberPlaceTable(props: SubscriberPlaceTableProps) {
  return <React.Suspense fallback={null}><SubscriberPlaceTableContent {...props} /></React.Suspense>;
}

function SubscriberPlaceTableContent({ value, persisted = value, onChange, subscriberId, disabled, readOnly }: SubscriberPlaceTableProps) {
  const { text, pick, lang } = useSubscriberText();
  const [query, setQuery] = React.useState('');
  const [term, setTerm] = React.useState('');
  const [rows, setRows] = React.useState<LinkedPlaceRow[]>([]);
  const [defaultFilter] = React.useState(subscriberId && persisted.length ? 'linked' : 'available');
  const { value: filter, onValueChange } = useUrlTab(['available', 'linked', 'all'], defaultFilter, 'placeFilter');
  const [paging, setPaging] = React.useState({ filter, term, skip: 0 });
  const skip = paging.filter === filter && paging.term === term ? paging.skip : 0;
  const setSkip = (next: number) => setPaging({ filter, term, skip: next });
  const [removed, setRemoved] = React.useState<string[]>([]);
  const [total, setTotal] = React.useState(0);
  const [resultFilter, setResultFilter] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    const timer = window.setTimeout(() => { setTerm(query.trim()); }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);
  React.useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true); setError('');
      try {
        const result = toList<LinkedPlaceRow>(await adminApi.get<unknown>('/v1/admin/places', { search: term || undefined, status: 'active', limit: 20, skip, subscriberId: filter === 'available' ? 'none' : filter === 'linked' ? subscriberId : undefined }));
        if (!active) return;
        setRows(result.items);
        setTotal(result.total); setResultFilter(filter);
      } catch { if (active) setError(text('Could not load places. Try again.', 'تعذر تحميل الأماكن. أعد المحاولة.')); }
      finally { if (active) setLoading(false); }
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [term, skip, retry, text, filter, subscriberId]);
  const selected = (place: LinkedPlaceRow) => value.some((entry) => entry.id === place.id) || Boolean(subscriberId && placeOwner(place)?.id === subscriberId && !removed.includes(place.id));
  const toggle = (place: LinkedPlaceRow) => {
    if (disabled || readOnly || linkedToAnother(place, subscriberId)) return;
    const chosen = selected(place);
    setRemoved((current) => chosen ? [...current, place.id] : current.filter((id) => id !== place.id));
    onChange(chosen ? value.filter((entry) => entry.id !== place.id) : [...value, place]);
  };
  return <div className="min-w-0 space-y-4">
    <SegmentedControl label="Link state" value={filter} onValueChange={(next) => { setSkip(0); onValueChange(next); }} options={[{ value: 'available', label: text('Available', 'المتاح') }, { value: 'linked', label: text('Linked here', 'المرتبط هنا'), disabled: !subscriberId }, { value: 'all', label: text('All', 'الكل') }].map((option) => ({ ...option, count: !loading && resultFilter === option.value ? total : undefined }))} />
    <div className="relative">
      <Search className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" />
      <Input data-ro-allow="true" value={query} onChange={(event) => setQuery(event.target.value)} className="ps-10"
        placeholder={text('Search active places by name…', 'ابحث بالاسم عن مكان نشط…')} aria-label={text('Search places', 'البحث عن مكان')} />
    </div>
    <div data-slot="linked-places-table" className="h-[320px] overflow-auto rounded-lg border sm:h-[420px]" aria-busy={loading}>
      <table className="w-full table-fixed text-start text-sm">
        <thead className="sticky top-0 z-10 bg-muted"><tr>
          <th scope="col" className="p-2 text-start">{text('Place', 'المكان')}</th>
          <th scope="col" className="hidden p-2 text-start sm:table-cell">{text('City · category', 'المدينة · التصنيف')}</th>
          <th scope="col" className="w-36 p-2 text-start sm:w-64">{text('Link state', 'حالة الربط')}</th>
        </tr></thead>
        <tbody>{rows.map((place) => {
          const chosen = selected(place);
          const other = linkedToAnother(place, subscriberId);
          const state = other ? text('Linked to', 'مرتبط بـ') + ' ' + (placeOwner(place)?.name ?? text('another subscriber', 'مشترك آخر')) :
            chosen ? text('Linked here', 'مرتبط هنا') : (place.subscriber !== undefined ? place.subscriber === null : place.subscriberId === null) ? text('Free', 'متاح') : '';
          const location = [place.city ? pick(place.city.name, place.city.nameEn) : '', place.category ? pick(place.category.nameAr, place.category.nameEn) : ''].filter(Boolean).join(' · ');
          return <tr key={place.id} tabIndex={0} className="h-[60px] border-t hover:bg-muted/40 focus-within:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring dark:hover:bg-background/30 dark:focus-within:bg-background/30"
            onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggle(place); } }}>
            <td className="min-w-0 px-2 py-1 align-middle"><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} />{location && <p className="truncate text-xs leading-3 text-muted-foreground sm:hidden" title={location}>{location}</p>}</td>
            <td className="hidden px-2 py-1 align-middle text-xs text-muted-foreground sm:table-cell"><p className="truncate" title={location}>{location}</p></td>
            <td className="px-2 py-1 align-middle"><div data-slot="linked-place-actions" className="flex min-w-0 flex-nowrap items-center justify-end gap-2">
              {state && <StatusBadge status="linked" className="min-w-0 text-start" title={state}><span className="truncate">{state}</span></StatusBadge>}
              {!readOnly && <Button type="button" size="icon-sm" variant="outline" className="shrink-0" aria-pressed={chosen} disabled={disabled || other}
                title={other ? state : (chosen ? text('Remove', 'إزالة') : text('Link', 'ربط')) + ' ' + pick(place.name, place.nameEn)} aria-label={other ? pick(place.name, place.nameEn) + ': ' + state : (chosen ? text('Remove', 'إزالة') : text('Link', 'ربط')) + ' ' + pick(place.name, place.nameEn)} onClick={() => toggle(place)}>
                {chosen ? <Check className="size-5 rounded-full bg-foreground p-0.5 text-background" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
              </Button>}
            </div></td>
          </tr>;
        })}
          <tr><td colSpan={3} className="p-4 text-center">
            {loading ? text('Loading…', 'جارٍ التحميل…') : error ? <div role="alert"><p>{error}</p><Button type="button" variant="outline" onClick={() => setRetry((current) => current + 1)}>{text('Retry', 'إعادة المحاولة')}</Button></div> : !rows.length ? text('No places match this search.', 'لا توجد أماكن تطابق البحث.') : null}
          </td></tr>
        </tbody>
      </table>
    </div>
    <Pager skip={skip} pageSize={20} total={total} count={rows.length} busy={loading} error={Boolean(error)} onPrevious={() => setSkip(Math.max(0, skip - 20))} onNext={() => setSkip(skip + 20)} />
    <section data-slot="chosen-places" className="space-y-3" aria-label={text('Chosen places', 'الأماكن المختارة')}>
      <h3 className="text-base font-semibold">{text('Chosen places', 'الأماكن المختارة')} <span className="text-xs font-normal tabular-nums text-muted-foreground">({value.length.toLocaleString(lang)})</span></h3>
      {!value.length ? <p className="text-sm text-muted-foreground">{text('No linked places yet.', 'لا توجد أماكن مرتبطة بعد.')}</p> :
        <ul className="space-y-2">{value.map((chosen) => {
          const place = rows.find((entry) => entry.id === chosen.id) ?? chosen;
          return <li key={place.id} className="flex min-h-14 min-w-0 items-center gap-3 border-b border-border p-3 hover:bg-muted/40 focus-within:bg-muted/40"><div className="min-w-0 flex-1"><RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} /></div>
            {!readOnly && <Button type="button" size="icon" variant="ghost" disabled={disabled || linkedToAnother(place, subscriberId)} title={text('Remove', 'إزالة') + ' ' + pick(place.name, place.nameEn)} aria-label={text('Remove', 'إزالة') + ' ' + pick(place.name, place.nameEn)} onClick={() => toggle(place)}><X className="size-4" aria-hidden="true" /></Button>}
          </li>;
        })}</ul>}
    </section>
  </div>;
}
