'use client';

/**
 * SectionPlacesDialog — pick which places appear in a custom storefront section.
 *
 * A custom ("pinned") section could be created but never filled: the backend had
 * PUT sections/:id/places, but the dashboard offered no way to call it, so every custom
 * section stayed empty on the homepage. This is that missing picker — search the catalog,
 * add places, reorder them, remove them, save.
 */

import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
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
  canWrite = false,
  sectionId,
  sectionTitle,
  open,
  onOpenChange,
  onSaved,
}: {
  canWrite?: boolean;
  sectionId: string | null;
  sectionTitle: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
}) {
  const controlCopy = useDashboardCopy();
  const [pinned, setPinned] = React.useState<PickPlace[]>([]);
  const [results, setResults] = React.useState<PickPlace[]>([]);
  const [query, setQuery] = React.useState('');
  const [loadedSectionId, setLoadedSectionId] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const pinnedIds = React.useMemo(() => new Set(pinned.map((p) => p.id)), [pinned]);
  // Still loading until this section's pins have arrived (reset when the dialog closes).
  const loading = Boolean(open && sectionId) && loadedSectionId !== sectionId && !loadError;

  // Load the current pins when the dialog opens.
  React.useEffect(() => {
    if (!open || !sectionId) return;
    let current = true;
    adminApi
      .get<PickPlace[]>(`/v1/admin/storefront/sections/${sectionId}/places`)
      .then((rows) => {
        if (!current) return;
        setPinned(Array.isArray(rows) ? rows : []);
        setLoadedSectionId(sectionId);
      })
      .catch(() => { if (current) { setLoadError(true); toast.error(controlCopy('Could not load this section’s places.')); } });
    return () => { current = false; };
  }, [open, sectionId, controlCopy]);

  // Clear the picker as the dialog closes, so it opens clean next time.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPinned([]);
      setQuery('');
      setResults([]);
      setLoadError(false);
      setLoadedSectionId(null);
    }
    onOpenChange(next);
  };

  // Debounced catalog search.
  React.useEffect(() => {
    if (!open || !canWrite) return;
    const q = query.trim();
    if (!q) return;
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
  }, [query, open, canWrite]);

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
    if (!canWrite || !sectionId || loading || loadError || saving) return;
    setSaving(true);
    try {
      await adminApi.put(`/v1/admin/storefront/sections/${sectionId}/places`, {
        placeIds: pinned.map((p) => p.id),
      });
      toast.success(controlCopy('Section places saved.'));
      handleOpenChange(false);
      onSaved?.();
    } catch (e) {
      const err = e as AdminApiError;
      toast.error(err.message || controlCopy('Could not save the section places.'));
    } finally {
      setSaving(false);
    }
  };

  const label = (p: PickPlace) => p.name || p.nameEn || '—';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) handleOpenChange(o); }}>
      <DialogContent data-trace-id="section-places-dialog" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle><DashboardText>Places in “</DashboardText>{sectionTitle}”</DialogTitle>
          <DialogDescription>
            <DashboardText>Search the catalog to add places, drag order with the arrows, and save. This section shows exactly these places, in this order, on the homepage and app.</DashboardText>
          </DialogDescription>
        </DialogHeader>

        {/* Search + results */}
        {canWrite && <div className="space-y-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (!e.target.value.trim()) setResults([]); }}
              placeholder={controlCopy("Search places to add…")}
              className="ps-9"
              data-trace-id="section-places-search"
            />
          </div>
          {results.length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border">
              {results.map((p) => {
                const already = pinnedIds.has(p.id);
                return (
                  <Button variant="ghost"
                    key={p.id}
                    type="button"
                    disabled={already || loading || loadError || saving}
                    onClick={() => add(p)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted disabled:opacity-50"
                    data-trace-id={`section-places-add-${p.id}`}
                  >
                    <Thumb src={p.coverImage} />
                    <span className="min-w-0 flex-1 truncate">{label(p)}</span>
                    {already ? (
                      <span className="text-xs text-muted-foreground"><DashboardText>Added</DashboardText></span>
                    ) : (
                      <Plus className="h-4 w-4 text-[var(--brand-600)]" />
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        }
        {/* Current pins */}
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <DashboardText>In this section (</DashboardText>{pinned.length})
          </p>
          {loading ? (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> <DashboardText>Loading…</DashboardText>
            </p>
          ) : pinned.length === 0 ? (
            <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
              <DashboardText>No places yet — search above to add some.</DashboardText>
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
                  <Button variant="ghost" type="button" aria-label={controlCopy("Move up")} disabled={!canWrite || saving || i === 0} onClick={() => move(i, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" type="button" aria-label={controlCopy("Move down")} disabled={!canWrite || saving || i === pinned.length - 1} onClick={() => move(i, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" type="button" aria-label={controlCopy("Remove")} disabled={!canWrite || saving} onClick={() => removeAt(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button data-ro-allow="true" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            <DashboardText>Cancel</DashboardText>
          </Button>
          <Button onClick={save} disabled={!canWrite || loading || loadError || saving} data-trace-id="section-places-save">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <DashboardText>Save places</DashboardText>
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
