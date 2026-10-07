'use client';

import { DashboardText } from '@/components/admin/dashboard-text';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, ChevronLeft, ChevronRight, Star, Eye, Navigation, Trash2, RotateCcw, Pencil, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAdminPlaces } from '@/lib/api/hooks/use-admin-places';
import { useAdminCities } from '@/lib/api/hooks/use-admin-cities';
import { useAdminCategories } from '@/lib/api/hooks/use-admin-categories';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { priceRangeLabel } from '@/lib/price-bands';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { Badge } from '@/components/ui/badge';
import { PlaceDeleteDialog } from '@/components/admin/place-delete-dialog';
import { PlaceRestoreDialog } from '@/components/admin/place-restore-dialog';

const PAGE_SIZE = 20;

/** Does this place have any media at all? Counts come from the admin list payload. */
function hasMedia(place: { _count?: { images: number; videos: number } }): boolean {
  const c = place._count;
  if (!c) return false;
  return (c.images ?? 0) > 0 || (c.videos ?? 0) > 0;
}

/** Name in the chosen language, falling back to the other so a cell is never blank. */
function pickName(ar: string | null | undefined, en: string | null | undefined, lang: 'en' | 'ar'): string {
  const a = ar?.trim() || '';
  const e = en?.trim() || '';
  return (lang === 'ar' ? a || e : e || a) || '—';
}

const PUBLIC_SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.5argny.com';

/** The public page for a place, or null when we lack the city slug to build one. */
function publicUrl(place: { slug: string; city?: { slug?: string } }): string | null {
  const citySlug = place.city?.slug;
  if (!citySlug || !place.slug) return null;
  return `${PUBLIC_SITE}/explorer/${citySlug}/${place.slug}`;
}

/**
 * Page numbers to show: always the first and last, plus a window around the current page,
 * with gaps elided. Twenty-two buttons in a row would be its own navigation problem.
 */
function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const pages = new Set<number>([0, total - 1, current]);
  for (const n of [current - 1, current + 1]) {
    if (n > 0 && n < total - 1) pages.add(n);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  const out: (number | null)[] = [];
  let previous: number | null = null;
  for (const n of sorted) {
    if (previous !== null && n - previous > 1) out.push(null);
    out.push(n);
    previous = n;
  }
  return out;
}

export default function PlacesPage() {
  const [search, setSearch] = useState('');
  // Name column follows the GLOBAL dashboard language toggle (in the header), not a
  // per-page one — the local EN/ع toggle here was a duplicate of it.
  const { lang } = useDashboardLang();
  const [statusFilter, setStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [mediaFilter, setMediaFilter] = useState('all');
  const [page, setPage] = useState(0);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ id: string; name: string } | null>(null);

  // Filter options. Cities and categories are small, fixed lists, so one fetch each.
  const { data: cityData } = useAdminCities({ limit: 100 });
  const { data: categoryData } = useAdminCategories();

  const { data, isLoading, isError, refetch } = useAdminPlaces({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    cityId: cityFilter === 'all' ? undefined : cityFilter,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
    hasMedia: mediaFilter === 'all' ? undefined : mediaFilter === 'with',
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });
  const { data: session } = useCurrentSession();
  const isSuperadmin = session?.user.role === 'super_admin';

  const visibleItems = useMemo(() => {
    const items = data?.items ?? [];
    if (statusFilter !== 'deleted') return items;
    return items.filter((p) => p.deletedAt != null);
  }, [data, statusFilter]);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const pageNumbers = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);
  const hasActiveFilters =
    search !== '' || statusFilter !== 'all' || cityFilter !== 'all' ||
    categoryFilter !== 'all' || mediaFilter !== 'all';

  // Rendered above and below the table: with twenty rows you would otherwise have to
  // scroll to the bottom to change page, then scroll back up to read the new one.
  function Pager({ position }: { position: 'top' | 'bottom' }) {
    if (totalPages <= 1) return null;
    return (
      <div
        className={
          position === 'top'
            ? 'flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-border'
            : 'flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-border'
        }
      >
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} <DashboardText>places</DashboardText></p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {pageNumbers.map((n, i) =>
            n === null ? (
              <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground select-none">…</span>
            ) : (
              <Button
                key={n}
                variant={n === page ? 'default' : 'outline'}
                size="sm"
                className="min-w-9 tabular-nums"
                aria-current={n === page ? 'page' : undefined}
                onClick={() => setPage(n)}
              >
                {n + 1}
              </Button>
            ),
          )}
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} aria-label="Next page">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Places</DashboardText></h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/places/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <DashboardText>Add Place</DashboardText>
          </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search places..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { if (v) { setStatusFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><DashboardText>Any status</DashboardText></SelectItem>
                <SelectItem value="active"><DashboardText>Active</DashboardText></SelectItem>
                <SelectItem value="draft"><DashboardText>Draft</DashboardText></SelectItem>
                <SelectItem value="deleted"><DashboardText>Deleted</DashboardText></SelectItem>
              </SelectContent>
            </Select>

            <Select value={cityFilter} onValueChange={(v) => { if (v) { setCityFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><DashboardText>Any city</DashboardText></SelectItem>
                {(cityData?.items ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{pickName(c.name, c.nameEn, lang)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(v) => { if (v) { setCategoryFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><DashboardText>Any category</DashboardText></SelectItem>
                {(categoryData ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{pickName(c.nameAr, c.nameEn, lang)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* The question this answers is "what still needs photos?", which is why the
                options are phrased as the work rather than as a boolean. */}
            <Select value={mediaFilter} onValueChange={(v) => { if (v) { setMediaFilter(v); setPage(0); } }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"><DashboardText>Any media</DashboardText></SelectItem>
                <SelectItem value="with"><DashboardText>Has media</DashboardText></SelectItem>
                <SelectItem value="without"><DashboardText>Needs media</DashboardText></SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch(''); setStatusFilter('all'); setCityFilter('all');
                  setCategoryFilter('all'); setMediaFilter('all'); setPage(0);
                }}
              >
                <DashboardText>Clear</DashboardText>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3"><DashboardText>Failed to load places</DashboardText></p>
              <Button variant="outline" onClick={() => refetch()}><DashboardText>Retry</DashboardText></Button>
            </div>
          ) : visibleItems.length > 0 ? (
            <>
              <Pager position="top" />
              {/* Nine columns don't fit a phone; the Table primitive scrolls its container,
                  and the min-width keeps the columns from crushing rather than letting them
                  collapse into an unreadable smear. */}
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead><DashboardText>Name</DashboardText></TableHead>
                    <TableHead><DashboardText>City</DashboardText></TableHead>
                    <TableHead><DashboardText>Category</DashboardText></TableHead>
                    <TableHead><DashboardText>Status</DashboardText></TableHead>
                    {/* Four metrics, each with a tooltip — an unlabelled icon column is a
                        guessing game. Rating is deliberately absent: there is no review
                        system yet, so any number here would be invented. */}
                    <TableHead className="text-center">
                      <span title="Saves — how many times this place has ever been saved. Only ever goes up; un-saving does not reduce it.">
                        <Star className="w-4 h-4 inline" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center">
                      <span title="Views — how many times the public detail page has been opened.">
                        <Eye className="w-4 h-4 inline" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center">
                      <span title="Directions — how many times someone tapped Directions / Go, from the website or the app. Only ever goes up.">
                        <Navigation className="w-4 h-4 inline" />
                      </span>
                    </TableHead>
                    <TableHead className="text-center">
                      <span title="Media — whether this place has any photo or video.">
                        <DashboardText>Media</DashboardText>
                      </span>
                    </TableHead>
                    <TableHead className="text-right"><DashboardText>Actions</DashboardText></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleItems.map((place) => {
                    const deletedAt = place.deletedAt ?? null;
                    return (
                    <TableRow key={place.id}>
                      <TableCell>
                        <Link href={`/dashboard/places/${place.id}`} className="hover:text-orange-600 font-medium" data-trace-id={`place-list-name-${place.id}`}>
                          {pickName(place.name, place.nameEn, lang)}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">{priceRangeLabel(place.priceRange, lang)}</p>
                        <Link href={`/dashboard/places/${place.id}?tab=menu`} className="mt-1 inline-block text-xs underline underline-offset-4">{lang === 'ar' ? 'الأسعار' : 'Pricing'}</Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{pickName(place.city?.name, place.city?.nameEn, lang)}</TableCell>
                      <TableCell className="text-muted-foreground">{pickName(place.category?.nameAr, place.category?.nameEn, lang)}</TableCell>
                      <TableCell>
                        {deletedAt ? (
                          <Badge variant="destructive" data-trace-id={`place-list-status-deleted-${place.id}`}><DashboardText>Deleted</DashboardText></Badge>
                        ) : (
                          <Badge variant={place.status === 'active' ? 'default' : 'secondary'}>
                            {place.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{place.saveCount ?? 0}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{place.viewCount ?? 0}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{place.directionsCount ?? 0}</TableCell>
                      <TableCell className="text-center">
                        {/* Boolean, not a count: the question this column answers is "does
                            this place still need photos?", and "0i 0v" made that a reading
                            exercise. The exact counts live on the Media tab. */}
                        {(place.hasMedia ?? hasMedia(place)) ? (
                          <Badge variant="secondary"><DashboardText>Yes</DashboardText></Badge>
                        ) : (
                          <Badge variant="destructive"><DashboardText>No</DashboardText></Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* Straight to the page a visitor sees. Checking your own work
                              should not mean reconstructing a URL by hand. */}
                          {publicUrl(place) && (
                            <a
                              href={publicUrl(place)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button variant="ghost" size="icon-sm" aria-label="View on the site" title="View on 5argny.com">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                          <Link href={`/dashboard/places/${place.id}`}>
                            <Button variant="ghost" size="icon-sm" aria-label="Edit" data-trace-id={`place-list-edit-${place.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </Link>
                          {deletedAt && isSuperadmin ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Restore"
                              onClick={() => setPendingRestore({ id: place.id, name: place.name })}
                              data-trace-id={`place-list-restore-${place.id}`}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          ) : !deletedAt ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Delete"
                              onClick={() => setPendingDelete({ id: place.id, name: place.name })}
                              data-trace-id={`place-list-delete-${place.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Pager position="bottom" />
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {statusFilter === 'deleted' ? 'No deleted places.' : 'No places found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <PlaceDeleteDialog
        placeId={pendingDelete?.id ?? null}
        placeName={pendingDelete?.name ?? null}
        open={pendingDelete !== null}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        onDeleted={async () => { setPendingDelete(null); await refetch(); }}
      />
      <PlaceRestoreDialog
        placeId={pendingRestore?.id ?? null}
        placeName={pendingRestore?.name ?? null}
        open={pendingRestore !== null}
        onOpenChange={(o) => { if (!o) setPendingRestore(null); }}
        onRestored={async () => { setPendingRestore(null); await refetch(); }}
      />
    </div>
  );
}
