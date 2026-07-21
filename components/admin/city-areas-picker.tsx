'use client';

import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { regionsForCity } from '@/lib/egypt-regions';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * CityAreasPicker — choose WHICH areas a city offers.
 *
 * A governorate has dozens of catalog districts, but a product usually covers only some.
 * The admin toggles the ones this city actually serves; a place created in the city then
 * picks its area from exactly this set (not the full 55). Stored as English catalog keys.
 *
 * `governorate` is the city's English name — the catalog groups areas under it. Until a
 * governorate is chosen there is nothing to pick from, which the empty state says.
 */
export function CityAreasPicker({
  governorate,
  value,
  onChange,
}: {
  governorate: string | undefined;
  value: string[];
  onChange: (keys: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const selected = new Set(value);

  const areas = useMemo(() => {
    if (!governorate) return [];
    const all = regionsForCity(governorate);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (r) => r.value.toLowerCase().includes(q) || r.nameAr.includes(query.trim()),
    );
  }, [governorate, query]);

  const toggle = (key: string) => {
    const next = new Set(value);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange([...next]);
  };

  if (!governorate) {
    return (
      <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
        Pick the city (governorate) first — its areas appear here to choose from.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter areas…"
            className="pl-9"
            aria-label="Filter areas"
          />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{value.length} selected</span>
      </div>

      <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-3">
        {areas.length === 0 ? (
          <p className="col-span-full p-3 text-center text-sm text-muted-foreground">
            No areas match “{query}”.
          </p>
        ) : (
          areas.map((a) => {
            const on = selected.has(a.value);
            return (
              <button
                key={a.value}
                type="button"
                onClick={() => toggle(a.value)}
                aria-pressed={on}
                data-trace-id={`city-area-${a.value.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                  on
                    ? 'border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--brand-700)]'
                    : 'border-transparent hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)]',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.value}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{a.nameAr}</span>
                </span>
                {on && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
