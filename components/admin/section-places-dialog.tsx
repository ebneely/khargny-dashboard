'use client';

/**
 * SectionPlacesDialog — pick which places appear in a custom storefront section.
 *
 * A custom ("pinned") section could be created but never filled: the backend had
 * PUT sections/:id/places, but the dashboard offered no way to call it, so every custom
 * section stayed empty on the homepage. This is that missing picker — search the catalog,
 * add places, reorder them, remove them, save.
 */

import * as React from 'react';
import { Loader2, Search, X, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';

type PickPlace = {
  id: string;
  name: string;
  nameEn?: string | null;
  coverImage?: string | null;
  city?: { name: string; nameEn?: string | null };
};

export function SectionPlacesDialog({
  sectionId,
  sectionTitle,
  open,
  onOpenChange,
  onSaved,
}: {
  sectionId: string | null;
  sectionTitle: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
}) {
  const [pinned, setPinned] = React.useState<PickPlace[]>([]);
  const [results, setResults] = React.useState<PickPlace[]>([]);
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const pinnedIds = React.useMemo(() => new Set(pinned.map((p) => p.id)), [pinned]);

  // Load the current pins when the dialog opens.
  React.useEffect(() => {
    if (!open || !sectionId) return;
    setLoading(true);
    setQuery('');
    setResults([]);
    adminApi
      .get<PickPlace[]>(`/v1/admin/storefront/sections/${sectionId}/places`)
      .then((rows) => setPinned(Array.isArray(rows) ? rows : []))
      .catch(() => toast.error('Could not load this section’s places.'))
      .finally(() => setLoading(false));
  }, [open, sectionId]);

  // Debounced catalog search.
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const id = setTimeout(() => {
      adminApi
        .get<{ data?: PickPlace[]; items?: PickPlace[] } | PickPlace[]>(
          '/v1/admin/places',
          { search: q, limit: 20 },
        )
        .then((res) => {
          const rows = Array.isArray(res) ? res : res.data ?? res.items ?? [];
          setResults(rows);
        })
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(id);
  }, [query, open]);

  const add = (p: PickPlace) => {
    if (pinnedIds.has(p.id)) return;
    setPinned((prev) => [...prev, p]);
  };
  const removeAt = (i: number) => setPinned((prev) => prev.filter((_, j) => j !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= pinned.length) return;
    setPinned((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const save = async () => {
    if (!sectionId) return;
    setSaving(true);
    try {
      await adminApi.put(`/v1/admin/storefront/sections/${sectionId}/places`, {
        placeIds: pinned.map((p) => p.id),
      });
      toast.success('Section places saved.');
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      const err = e as AdminApiError;
      toast.error(err.message || 'Could not save the section places.');
    } finally {
      setSaving(false);
    }
  };

  const label = (p: PickPlace) => p.name || p.nameEn || '—';

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent data-trace-id="section-places-dialog" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Places in “{sectionTitle}”</DialogTitle>
          <DialogDescription>
            Search the catalog to add places, drag order with the arrows, and save. This
            section shows exactly these places, in this order, on the homepage and app.
          </DialogDescription>
        </DialogHeader>

        {/* Search + results */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search places to add…"
              className="pl-9"
              data-trace-id="section-places-search"
            />
          </div>
          {results.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border">
              {results.map((p) => {
                const already = pinnedIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={already}
                    onClick={() => add(p)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
                    data-trace-id={`section-places-add-${p.id}`}
                  >
                    <Thumb src={p.coverImage} />
                    <span className="min-w-0 flex-1 truncate">{label(p)}</span>
                    {already ? (
                      <span className="text-xs text-muted-foreground">Added</span>
                    ) : (
                      <Plus className="h-4 w-4 text-[var(--brand-600)]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Current pins */}
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            In this section ({pinned.length})
          </p>
          {loading ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : pinned.length === 0 ? (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              No places yet — search above to add some.
            </p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {pinned.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-md border px-2 py-1.5"
                  data-trace-id={`section-places-pinned-${p.id}`}
                >
                  <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
                  <Thumb src={p.coverImage} />
                  <span className="min-w-0 flex-1 truncate text-sm">{label(p)}</span>
                  <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Move down" disabled={i === pinned.length - 1} onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Remove" onClick={() => removeAt(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} data-trace-id="section-places-save">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save places
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Thumb({ src }: { src?: string | null }) {
  if (!src) {
    return <span className="h-8 w-8 shrink-0 rounded bg-[var(--gray-100)]" aria-hidden="true" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />;
}
