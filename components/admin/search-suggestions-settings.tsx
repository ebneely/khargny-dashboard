'use client';

// Which search suggestions the website and the apps show, and the city they use when a person has not chosen one
// (owner 2026-11-14). Stored with the algorithm settings (decision 0006), group "search".
import * as React from 'react';
import { toast } from 'sonner';
import { adminApi } from '@/lib/api/admin-client';
import { loadAllCities } from '@/lib/api/hooks/use-admin-cities';
import { useDashboardCopy } from './dashboard-text';
import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

type SearchValues = { defaultCitySlug: string; suggestInCity: boolean; suggestOpenNow: boolean; suggestPlaces: boolean };
type Row = { version: number; values: Record<string, unknown> & { search?: SearchValues } };
const START: SearchValues = { defaultCitySlug: 'cairo', suggestInCity: true, suggestOpenNow: true, suggestPlaces: true };

export function SearchSuggestionsSettings() {
  const copy = useDashboardCopy();
  const readOnly = useDashboardReadOnly();
  const [row, setRow] = React.useState<Row | null>(null);
  const [cities, setCities] = React.useState<{ slug: string; label: string }[]>([]);
  const [search, setSearch] = React.useState<SearchValues>(START);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    adminApi.get<Row>('/v1/admin/algorithm/settings').then((r) => { setRow(r); setSearch({ ...START, ...r.values.search }); }).catch(() => toast.error(copy('Could not load the search settings.')));
    loadAllCities().then((l) => setCities(l.items.map((c) => ({ slug: c.slug, label: c.nameEn || c.name })))).catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!row) return;
    setBusy(true);
    try {
      // the self-learning card saves the same record: read the newest version and change only the search group
      const latest = await adminApi.get<Row>('/v1/admin/algorithm/settings');
      const next = await adminApi.put<Row>('/v1/admin/algorithm/settings', { values: { ...latest.values, search }, note: 'search suggestions' });
      setRow(next); toast.success(copy('Search settings saved.'));
    } catch { toast.error(copy('Could not save the search settings (super admin only).')); } finally { setBusy(false); }
  };

  const kinds: [keyof SearchValues, string][] = [['suggestInCity', '"{category} in {city}"'], ['suggestOpenNow', '"{category} open now"'], ['suggestPlaces', 'Place matches']];
  return <Card><CardHeader><CardTitle>{copy('Search suggestions')}</CardTitle><CardDescription>{copy('Suggestions use the city the person chose, otherwise the nearest city from their location, otherwise the default city below.')}</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm"><span className="font-medium">{copy('Default city')}</span>
        <select className="h-9 max-w-xs rounded-md border border-input bg-background px-2" value={search.defaultCitySlug} disabled={!row} onChange={(e) => setSearch({ ...search, defaultCitySlug: e.target.value })}>
          {[...new Map([...cities, { slug: search.defaultCitySlug, label: search.defaultCitySlug }].map((c) => [c.slug, c])).values()].map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
        </select></label>
      {kinds.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 text-sm"><span>{label.startsWith('"') ? label : copy(label)}</span>
        <Switch checked={search[key] as boolean} disabled={!row} onCheckedChange={(on: boolean) => setSearch({ ...search, [key]: on })} /></label>)}
      {!readOnly && <div><Button onClick={save} disabled={!row || busy}>{copy('Save')}</Button></div>}
    </CardContent></Card>;
}
