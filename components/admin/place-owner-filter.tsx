'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/lib/api/admin-client';
import type { Subscriber } from '@/lib/api/subscribers';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { FilterSelect } from './filter-bar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RequestError, SubscriberSelect, useSubscriberText } from './subscriber-ui';

export function PlaceOwnerFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { text } = useSubscriberText();
  const [choosing, setChoosing] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [term, setTerm] = React.useState('');
  const [selected, setSelected] = React.useState<{ id: string; name: string } | null>(null);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const load = React.useCallback(() => choosing ? adminApi.list<Subscriber>('/v1/admin/subscribers', { search: term || undefined, limit: 20, skip: 0 }) : Promise.resolve({ items: [], total: 0, skip: 0, limit: 20 }), [choosing, term]);
  const subscribers = useSubscriberResource(load);
  const choices = subscribers.data?.items ?? [];
  return <div className="min-w-0">
    <FilterSelect label="Any owner" value={value} onValueChange={(next) => {
      setChoosing(next === 'choose');
      if (next !== 'choose') onChange(next);
    }} options={[{ value: 'all', label: text('Any owner', 'أي مشترك') }, { value: 'none', label: text('No subscriber', 'بدون مشترك') }, ...(selected ? [{ value: selected.id, label: selected.name }] : []), { value: 'choose', label: text('Choose subscriber', 'اختر مشتركاً') }]} />
    <Dialog open={choosing} onOpenChange={setChoosing}><DialogContent><DialogHeader><DialogTitle>{text('Choose subscriber', 'اختر مشتركاً')}</DialogTitle></DialogHeader>
      <Input data-ro-allow="true" type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label={text('Search subscribers', 'ابحث عن المشتركين')} placeholder={text('Search subscribers', 'ابحث عن المشتركين')} />
      <SubscriberSelect data-ro-allow="true" value={value === 'all' || value === 'none' ? '' : value} disabled={subscribers.loading || Boolean(subscribers.error)} onValueChange={(id) => {
        const subscriber = choices.find((entry) => entry.id === id);
        if (!subscriber) return;
        setSelected({ id: subscriber.id, name: subscriber.name }); onChange(id); setChoosing(false);
      }} options={[{ value: '', label: text('Choose subscriber', 'اختر مشتركاً') }, ...(selected && !choices.some((entry) => entry.id === selected.id) ? [{ value: selected.id, label: selected.name }] : []), ...choices.map((subscriber) => ({ value: subscriber.id, label: subscriber.name }))]} aria-label={text('Choose subscriber', 'اختر مشتركاً')} />
      {subscribers.error && <RequestError message={text('Could not load subscribers.', 'تعذر تحميل المشتركين.')} retry={() => { void subscribers.refetch(); }} />}
    </DialogContent></Dialog>
  </div>;
}
