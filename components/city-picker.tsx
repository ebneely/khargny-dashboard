'use client';

/**
 * CityPicker — choose the city from Egypt's 27 governorates.
 *
 * A city in this product IS a governorate; the areas inside it (Nasr City, Zamalek) are
 * regions, picked separately. City names were free text, so the same governorate could be
 * saved as "Cairo", "cairo" or "القاهرة" and nothing could group by it — and a city could be
 * created that isn't a real governorate at all.
 *
 * Selecting one fills the Arabic and English name fields, so an editor types neither.
 */

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { EGYPT_CITIES, regionsForCity } from '@/lib/egypt-regions';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function CityPicker({
  value,
  onSelect,
  traceId,
}: {
  /** The English governorate name currently chosen. */
  value: string;
  onSelect: (city: { value: string; nameAr: string }) => void;
  traceId?: string;
}) {
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EGYPT_CITIES;
    return EGYPT_CITIES.filter(
      (c) => c.value.toLowerCase().includes(q) || c.nameAr.includes(query.trim()),
    );
  }, [query]);

  return (
    <div className="space-y-2" data-trace-id={traceId}>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search governorate — cairo, red sea, الأقصر…"
        aria-label="Search governorate"
      />

      <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-3">
        {matches.length === 0 ? (
          <p className="col-span-full p-3 text-center text-sm text-muted-foreground">
            No governorate matches “{query}”.
          </p>
        ) : (
          matches.map((c) => {
            const isSelected = c.value === value;
            const areaCount = regionsForCity(c.value).length;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onSelect(c)}
                aria-pressed={isSelected}
                data-trace-id={
                  traceId ? `${traceId}-${c.value.toLowerCase().replace(/\s+/g, '-')}` : undefined
                }
                className={cn(
                  'flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                  isSelected
                    ? 'border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--brand-700)]'
                    : 'border-transparent hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)]',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.value}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {c.nameAr} · {areaCount} area{areaCount === 1 ? '' : 's'}
                  </span>
                </span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
