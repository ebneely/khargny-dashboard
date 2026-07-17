'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, ChevronLeft, ChevronRight, Star, Eye, Trash2, RotateCcw, Pencil } from 'lucide-react';
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
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { Badge } from '@/components/ui/badge';
import { PlaceDeleteDialog } from '@/components/admin/place-delete-dialog';
import { PlaceRestoreDialog } from '@/components/admin/place-restore-dialog';

const PAGE_SIZE = 20;

export default function PlacesPage() {
  const [search, setSearch] = useState('');
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Places</h1>
        <Link href="/dashboard/places/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Place
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center"><Star className="w-4 h-4 inline" /></TableHead>
                    <TableHead className="text-center"><Eye className="w-4 h-4 inline" /></TableHead>
                    <TableHead className="text-center">Media</TableHead>
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
                          {place.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{place.city?.name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{place.category?.nameAr || place.category?.nameEn || '—'}</TableCell>
                      <TableCell>
                        {deletedAt ? (
                          <Badge variant="destructive" data-trace-id={`place-list-status-deleted-${place.id}`}>Deleted</Badge>
                        ) : (
                          <Badge variant={place.status === 'active' ? 'default' : 'secondary'}>
                            {place.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{place.rating > 0 ? place.rating.toFixed(1) : '—'}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{place.viewCount}</TableCell>
                      <TableCell className="text-center text-muted-foreground text-sm">
                        {place._count ? `${place._count.images}i ${place._count.videos}v` : '—'}
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
