'use client';

/**
 * RegionPicker — pick the AREA a place sits in (Nasr City, Zamalek, Naama Bay), grouped by
 * the CITY it belongs to, where city means one of Egypt's 27 governorates.
 *
 * Region was a free-text input, so the same area arrived spelled several ways and nothing
 * could group or filter by it. Search matches the English name, the Arabic name, the parent
 * city, and known landmarks — typing "pyramids" finds Nazlet El Semman, "cairo" lists every
 * Cairo district, "الزمالك" finds Zamalek.
 */

import { DashboardText } from '@/components/admin/dashboard-text';
import { useMemo, useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import { EGYPT_REGIONS, EGYPT_CITIES, findRegion, type EgyptRegion } from '@/lib/egypt-regions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function RegionPicker({
  value,
  onChange,
  onSelect,
  traceId,
  /** Pre-filter to one city's governorate, e.g. when the city is already chosen. */
  city,
  /**
   * Restrict the choices to exactly these catalog keys — the areas an admin curated onto
   * the selected city. When set, ONLY these show (the whole point: a place's area comes
   * from its city's list, not the full 55-area governorate). Undefined/empty means "not
   * curated", and the picker falls back to the governorate filter.
   */
  allowedKeys,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Fired with the full record on pick, so a form can auto-fill its name fields. */
  onSelect?: (region: EgyptRegion) => void;
  traceId?: string;
  city?: string;
  allowedKeys?: string[];
}) {
  const allowed = allowedKeys && allowedKeys.length > 0 ? new Set(allowedKeys) : null;
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
    // A curated area list wins over the governorate filter: it's the exact set the city
    // offers, so nothing outside it should ever appear.
    const base = allowed
      ? EGYPT_REGIONS.filter((r) => allowed.has(r.value))
      : EGYPT_REGIONS;
    const pool = activeCity
      ? base.filter((r) => r.governorate.toLowerCase() === activeCity.toLowerCase())
      : base;

    const matches = q
      ? pool.filter(
          (r) =>
            r.value.toLowerCase().includes(q) ||
            r.nameAr.includes(query.trim()) ||
            r.town.toLowerCase().includes(q) ||
            r.governorate.toLowerCase().includes(q) ||
            (r.keywords ?? []).some((k) => k.includes(q)),
        )
      : pool;

    // Group by governorate (= city), in catalog order so Cairo/Giza/Alexandria come first.
    const byCity = new Map<string, EgyptRegion[]>();
    for (const region of matches) {
      if (!byCity.has(region.governorate)) byCity.set(region.governorate, []);
      byCity.get(region.governorate)!.push(region);
    }
    return Array.from(byCity.entries());
    // allowedKeys drives `allowed`; include it so the pool recomputes when the city changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, city, cityFilter, allowedKeys?.join(',')]);

  return (
    <div className="space-y-2" data-trace-id={traceId}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search area — zamalek, nasr city, naama bay, الزمالك…"
          aria-label="Search region"
        />
        {!city && (
          <Select value={cityFilter} onValueChange={(value) => setCityFilter(value ?? '')}>
            <SelectTrigger aria-label="Filter by city" data-trace-id={traceId ? `${traceId}-city-filter` : undefined} className="min-h-11 w-full sm:w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value=""><DashboardText>All cities (27 governorates)</DashboardText></SelectItem>
              {EGYPT_CITIES.map((cityOption) => <SelectItem key={cityOption.value} value={cityOption.value}>{cityOption.value} — {cityOption.nameAr}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            data-trace-id={traceId ? `${traceId}-clear` : undefined}
          >
            <DashboardText>Clear</DashboardText>
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {selected ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span className="font-medium">{selected.value}</span>
            <span>
              — {selected.nameAr} · {selected.governorate}
            </span>
          </span>
        ) : value ? (
          // A value typed before this picker existed — shown, not silently dropped.
          <span>
            <DashboardText>Current:</DashboardText> <span className="font-medium">{value}</span> <DashboardText>(not in the list — pick one below to normalise it)</DashboardText>
          </span>
        ) : (
          'No region selected.'
        )}
      </p>

      <div className="max-h-72 overflow-y-auto rounded-md border p-2">
        {groups.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            <DashboardText>No region matches “</DashboardText>{query}”.
          </p>
        ) : (
          groups.map(([cityName, regions]) => (
            <div key={cityName} className="mb-3 last:mb-0">
              <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {cityName}
                <span className="ml-1.5 font-normal normal-case opacity-70">
                  {regions.length} <DashboardText>area</DashboardText>{regions.length === 1 ? '' : 's'}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {regions.map((region) => {
                  const isSelected = region.value === value;
                  return (
                    <Button variant="ghost"
                      key={`${region.governorate}-${region.value}`}
                      type="button"
                      onClick={() => pick(region)}
                      aria-pressed={isSelected}
                      title={`${region.value} — ${region.nameAr} (${region.town}, ${region.governorate})`}
                      data-trace-id={
                        traceId
                          ? `${traceId}-${region.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
                          : undefined
                      }
                      className={cn(
                        'flex h-auto min-h-14 items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-start text-sm transition-colors',
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
                    </Button>
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
