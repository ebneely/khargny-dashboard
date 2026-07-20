'use client';

/**
 * RegionPicker — pick the AREA a place sits in (Nasr City, Zamalek, Naama Bay), grouped by
 * the city it belongs to.
 *
 * Region was a free-text input, so the same area arrived spelled several ways and nothing
 * could group or filter by it. Search matches the English name, the Arabic name, the parent
 * city, and known landmarks — typing "pyramids" finds Nazlet El Semman, "cairo" lists every
 * Cairo district, "الزمالك" finds Zamalek.
 */

import { useMemo, useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import { EGYPT_REGIONS, REGION_CITIES, findRegion, type EgyptRegion } from '@/lib/egypt-regions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RegionPicker({
  value,
  onChange,
  onSelect,
  traceId,
  /** Pre-filter to one city's areas, e.g. when the city is already chosen. */
  city,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Fired with the full record on pick, so a form can auto-fill its name fields. */
  onSelect?: (region: EgyptRegion) => void;
  traceId?: string;
  city?: string;
}) {
  const [query, setQuery] = useState('');
  // Filter by city as well as free-text search: an editor who knows the place is in Cairo
  // shouldn't have to scroll past every other governorate to find its district.
  const [cityFilter, setCityFilter] = useState<string>('');
  const selected = findRegion(value);

  const pick = (region: EgyptRegion) => {
    onChange(region.value);
    onSelect?.(region);
  };

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const activeCity = city || cityFilter;
    const pool = activeCity
      ? EGYPT_REGIONS.filter((r) => r.city.toLowerCase() === activeCity.toLowerCase())
      : EGYPT_REGIONS;

    const matches = q
      ? pool.filter(
          (r) =>
            r.value.toLowerCase().includes(q) ||
            r.nameAr.includes(query.trim()) ||
            r.city.toLowerCase().includes(q) ||
            r.governorate.toLowerCase().includes(q) ||
            (r.keywords ?? []).some((k) => k.includes(q)),
        )
      : pool;

    // Group by city, preserving catalog order so Cairo/Giza/Alexandria come first.
    const byCity = new Map<string, EgyptRegion[]>();
    for (const region of matches) {
      if (!byCity.has(region.city)) byCity.set(region.city, []);
      byCity.get(region.city)!.push(region);
    }
    return Array.from(byCity.entries());
  }, [query, city, cityFilter]);

  return (
    <div className="space-y-2" data-trace-id={traceId}>
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search area — zamalek, nasr city, naama bay, الزمالك…"
          aria-label="Search region"
        />
        {!city && (
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            aria-label="Filter by city"
            data-trace-id={traceId ? `${traceId}-city-filter` : undefined}
            className="h-9 shrink-0 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">All cities</option>
            {REGION_CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            data-trace-id={traceId ? `${traceId}-clear` : undefined}
          >
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {selected ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span className="font-medium">{selected.value}</span>
            <span>
              — {selected.nameAr} · {selected.city}
            </span>
          </span>
        ) : value ? (
          // A value typed before this picker existed — shown, not silently dropped.
          <span>
            Current: <span className="font-medium">{value}</span> (not in the list — pick one
            below to normalise it)
          </span>
        ) : (
          'No region selected.'
        )}
      </p>

      <div className="max-h-72 overflow-y-auto rounded-md border p-2">
        {groups.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No region matches “{query}”.
          </p>
        ) : (
          groups.map(([cityName, regions]) => (
            <div key={cityName} className="mb-3 last:mb-0">
              <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {cityName}
                <span className="ml-1.5 font-normal normal-case opacity-70">
                  {regions[0].governorate}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {regions.map((region) => {
                  const isSelected = region.value === value;
                  return (
                    <button
                      key={`${region.city}-${region.value}`}
                      type="button"
                      onClick={() => pick(region)}
                      aria-pressed={isSelected}
                      title={`${region.value} — ${region.nameAr} (${region.city})`}
                      data-trace-id={
                        traceId
                          ? `${traceId}-${region.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                          : undefined
                      }
                      className={cn(
                        'flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                        isSelected
                          ? 'border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--brand-700)]'
                          : 'border-transparent hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)]',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{region.value}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {region.nameAr}
                        </span>
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
