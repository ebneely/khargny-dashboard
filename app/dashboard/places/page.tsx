'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, ChevronLeft, ChevronRight, Star, Eye, Navigation, Trash2, RotateCcw, Pencil } from 'lucide-react';
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
import { useDashboardLang } from '@/lib/dashboard-lang';
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

export default function PlacesPage() {
  const [search, setSearch] = useState('');
  // Name column follows the GLOBAL dashboard language toggle (in the header), not a
  // per-page one — the local EN/ع toggle here was a duplicate of it.
  const { lang } = useDashboardLang();
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading, isError, refetch } = useAdminPlaces({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground">Places</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/places/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Place
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
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
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
              <p className="text-muted-foreground mb-3">Failed to load places</p>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : visibleItems.length > 0 ? (
            <>
              {/* Nine columns don't fit a phone; the Table primitive scrolls its container,
                  and the min-width keeps the columns from crushing rather than letting them
                  collapse into an unreadable smear. */}
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
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
                        Media
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      </TableCell>
                      <TableCell className="text-muted-foreground">{pickName(place.city?.name, place.city?.nameEn, lang)}</TableCell>
                      <TableCell className="text-muted-foreground">{pickName(place.category?.nameAr, place.category?.nameEn, lang)}</TableCell>
                      <TableCell>
                        {deletedAt ? (
                          <Badge variant="destructive" data-trace-id={`place-list-status-deleted-${place.id}`}>Deleted</Badge>
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
                          <Badge variant="secondary">Yes</Badge>
                        ) : (
                          <Badge variant="destructive">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
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

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages} ({data?.total ?? 0} total)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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
