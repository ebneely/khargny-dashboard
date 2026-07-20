'use client';

/**
 * RegionPicker — pick a city's governorate from Egypt's official 27, with search.
 *
 * Replaces a free-text Region input. Typed values could not be grouped or filtered on,
 * and the same governorate arrived spelled several ways. Searching matches the English
 * name, the Arabic name, and well-known places inside it — typing "sharm", "gouna" or
 * "الأقصر" finds the right governorate without knowing which one it belongs to.
 */

import { useMemo, useState } from 'react';
import { Check, MapPin } from 'lucide-react';
import {
  EGYPT_GOVERNORATES,
  EGYPT_REGION_GROUP_LABELS,
  findGovernorate,
  type EgyptRegionGroup,
} from '@/lib/egypt-governorates';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function RegionPicker({
  value,
  onChange,
  traceId,
}: {
  value: string;
  onChange: (value: string) => void;
  traceId?: string;
}) {
  const [query, setQuery] = useState('');
  const selected = findGovernorate(value);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? EGYPT_GOVERNORATES.filter(
          (g) =>
            g.value.toLowerCase().includes(q) ||
            g.nameAr.includes(query.trim()) ||
            (g.keywords ?? []).some((k) => k.includes(q)),
        )
      : EGYPT_GOVERNORATES;

    const byGroup = new Map<EgyptRegionGroup, typeof EGYPT_GOVERNORATES>();
    for (const gov of matches) {
      if (!byGroup.has(gov.group)) byGroup.set(gov.group, []);
      byGroup.get(gov.group)!.push(gov);
    }
    return Array.from(byGroup.entries());
  }, [query]);

  return (
    <div className="space-y-2" data-trace-id={traceId}>
      <div className="flex items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search governorate — luxor, sharm, الأقصر, gouna…"
          aria-label="Search governorate"
        />
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
            <span>— {selected.nameAr}</span>
          </span>
        ) : value ? (
          // A value saved before this picker existed, or one typed by hand.
          <span>
            Current: <span className="font-medium">{value}</span> (not one of the 27
            governorates — pick one below to normalise it)
          </span>
        ) : (
          'No governorate selected.'
        )}
      </p>

      <div className="max-h-64 overflow-y-auto rounded-md border p-2">
        {groups.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No governorate matches “{query}”.
          </p>
        ) : (
          groups.map(([group, govs]) => (
            <div key={group} className="mb-3 last:mb-0">
              <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {EGYPT_REGION_GROUP_LABELS[group]}
              </p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {govs.map((gov) => {
                  const isSelected = gov.value === value;
                  return (
                    <button
                      key={gov.value}
                      type="button"
                      onClick={() => onChange(gov.value)}
                      aria-pressed={isSelected}
                      data-trace-id={traceId ? `${traceId}-${gov.value.toLowerCase().replace(/\s+/g, '-')}` : undefined}
                      className={cn(
                        'flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                        isSelected
                          ? 'border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--brand-700)]'
                          : 'border-transparent hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)]',
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{gov.value}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {gov.nameAr}
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
