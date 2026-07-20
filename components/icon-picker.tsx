'use client';

/**
 * IconPicker — pick an icon by looking at it, not by typing its name.
 *
 * Backs both the category form (which previously offered a text-label dropdown, so the admin
 * chose "Beach (waves)" without seeing the glyph) and the amenity form (which was a free-text
 * input, so an admin could save "wifi ", "WiFi" or "wi-fi" — none of which any surface knew
 * how to draw).
 *
 * The value stored is a lucide icon name from lib/icon-catalog.ts. The same name renders the
 * same glyph on the web storefront (lucide-react) and in the Expo app (lucide-react-native),
 * bundled in all three — nothing is fetched at runtime.
 */

import { useMemo, useState } from 'react';
import * as Lucide from 'lucide-react';
import {
  ICONS,
  ICON_GROUP_LABELS,
  iconsForScope,
  type IconGroup,
  type IconScope,
} from '@/lib/icon-catalog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Resolve a catalog name ("shopping-bag") to its lucide component (ShoppingBag). Lucide
 * exports PascalCase, so the kebab-case catalog value is converted rather than maintained as
 * a second hand-written map that could drift out of sync.
 */
export function lucideByName(name: string | undefined | null) {
  if (!name) return null;
  const pascal = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const Comp = (Lucide as unknown as Record<string, unknown>)[pascal];
  // Lucide icons are forwardRef objects, NOT plain functions. A `typeof === 'function'`
  // check rejects every one of them, which silently rendered the whole catalog as the
  // MapPin fallback — every option in the picker looked identical.
  return isRenderable(Comp)
    ? (Comp as React.ComponentType<{ size?: number; className?: string }>)
    : null;
}

function isRenderable(comp: unknown): boolean {
  return (
    typeof comp === 'function' ||
    (typeof comp === 'object' && comp !== null && '$$typeof' in comp)
  );
}

export function IconPreview({ name, size = 18 }: { name?: string | null; size?: number }) {
  const Comp = lucideByName(name) ?? Lucide.MapPin;
  return <Comp size={size} />;
}

export function IconPicker({
  value,
  onChange,
  traceId,
  scope = 'all',
}: {
  value: string;
  onChange: (value: string) => void;
  traceId?: string;
  /** Which slice of the catalog to offer — categories and amenities need different icons. */
  scope?: IconScope;
}) {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const available = iconsForScope(scope);
    const q = query.trim().toLowerCase();
    const matches = q
      ? available.filter(
          (i) =>
            i.value.includes(q) ||
            i.label.toLowerCase().includes(q) ||
            (i.keywords ?? []).some((k) => k.includes(q)),
        )
      : available;

    const byGroup = new Map<IconGroup, typeof ICONS>();
    for (const icon of matches) {
      if (!byGroup.has(icon.group)) byGroup.set(icon.group, []);
      byGroup.get(icon.group)!.push(icon);
    }
    return Array.from(byGroup.entries());
  }, [query, scope]);

  const selected = ICONS.find((i) => i.value === value);

  return (
    <div className="space-y-3" data-trace-id={traceId}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-[var(--gray-50)]">
          <IconPreview name={value} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons — wifi, parking, calm, coffee…"
            aria-label="Search icons"
          />
        </div>
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
          <>
            Selected: <span className="font-medium">{selected.label}</span>{' '}
            <code className="text-[11px]">{selected.value}</code>
          </>
        ) : (
          'No icon selected — the site falls back to a generic pin.'
        )}
      </p>

      <div className="max-h-72 overflow-y-auto rounded-md border p-2">
        {groups.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            No icon matches “{query}”.
          </p>
        ) : (
          groups.map(([group, icons]) => (
            <div key={group} className="mb-3 last:mb-0">
              <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {ICON_GROUP_LABELS[group]}
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-1.5">
                {icons.map((icon) => {
                  const isSelected = icon.value === value;
                  return (
                    <button
                      key={icon.value}
                      type="button"
                      title={`${icon.label} (${icon.value})`}
                      aria-label={icon.label}
                      aria-pressed={isSelected}
                      onClick={() => onChange(icon.value)}
                      data-trace-id={traceId ? `${traceId}-${icon.value}` : undefined}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-md border p-2 text-center transition-colors',
                        isSelected
                          ? 'border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--brand-700)]'
                          : 'border-transparent hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)]',
                      )}
                    >
                      <IconPreview name={icon.value} size={20} />
                      <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
                        {icon.label}
                      </span>
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
