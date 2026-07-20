'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronLeft, ChevronRight, Trash2, RotateCcw, Pencil } from 'lucide-react';
import { toast } from 'sonner';
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
import { useAdminCities } from '@/lib/api/hooks/use-admin-cities';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { Badge } from '@/components/ui/badge';
import { CityDeleteDialog } from '@/components/admin/city-delete-dialog';
import { CityRestoreDialog } from '@/components/admin/city-restore-dialog';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'active' | 'draft' | 'deleted';

export default function CitiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ id: string; name: string } | null>(null);

  const skip = page * PAGE_SIZE;
  const { data, isLoading, isError, refetch } = useAdminCities({
    region: undefined,
    status: statusFilter === 'deleted' ? undefined : statusFilter === 'all' ? undefined : statusFilter,
    skip,
    limit: PAGE_SIZE,
  });
  const { data: session } = useCurrentSession();
  const isSuperadmin = session?.user.role === 'super_admin';

  const items = data?.items ?? [];

  const visibleItems = useMemo(() => {
    if (statusFilter !== 'deleted') return items;
    return items.filter((c) => (c as { deletedAt?: string | null }).deletedAt != null);
  }, [items, statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return visibleItems;
    const q = search.toLowerCase();
    return visibleItems.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.nameEn && c.nameEn.toLowerCase().includes(q)) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [visibleItems, search]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 0;

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Cities</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground">Cities</h1>
        <Link href="/dashboard/cities/new">
          <Button className="gap-2" data-trace-id="city-list-add">
            <Plus className="w-4 h-4" />
            Add City
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, name (En), or slug..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
                data-trace-id="city-list-search"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => { if (v) { setStatusFilter(v as StatusFilter); setPage(0); } }}
            >
              <SelectTrigger className="w-40" data-trace-id="city-list-status-filter">
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
              <p className="text-muted-foreground mb-3" role="alert">Failed to load cities</p>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : filtered.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>English</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead className="text-center">Places</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Featured</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((city) => {
                    const deletedAt = (city as { deletedAt?: string | null }).deletedAt ?? null;
                    return (
                      <TableRow key={city.id}>
                        <TableCell>
                          <Link
                            href={`/dashboard/cities/${city.id}`}
                            className="hover:text-orange-600 font-medium"
                            data-trace-id={`city-list-name-${city.id}`}
                          >
                            {city.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{city.nameEn || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">{city.slug}</TableCell>
                        <TableCell className="text-muted-foreground">{city.region || '—'}</TableCell>
                        <TableCell className="text-center text-sm">
                          {(city.placeCount ?? 0) > 0 ? (
                            <span title={`${city.activePlaceCount ?? 0} active of ${city.placeCount} total`}>
                              {city.placeCount}
                              <span className="text-muted-foreground"> ({city.activePlaceCount ?? 0} active)</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {deletedAt ? (
                            <Badge variant="destructive" data-trace-id={`city-list-status-deleted-${city.id}`}>Deleted</Badge>
                          ) : (
                            <Badge variant={city.status === 'active' ? 'default' : 'secondary'}>
                              {city.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">{city.featured ? '✓' : '—'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/dashboard/cities/${city.id}`}>
                              <Button variant="ghost" size="icon-sm" aria-label="Edit" data-trace-id={`city-list-edit-${city.id}`}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </Link>
                            {deletedAt && isSuperadmin ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Restore"
                                onClick={() => setPendingRestore({ id: city.id, name: city.name })}
                                data-trace-id={`city-list-restore-${city.id}`}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            ) : !deletedAt ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Delete"
                                onClick={() => setPendingDelete({ id: city.id, name: city.name })}
                                data-trace-id={`city-list-delete-${city.id}`}
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
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {search ? 'No cities match your search.' : 'No cities found.'}
              </p>
              {!search && (
                <Link href="/dashboard/cities/new" className="inline-block mt-3">
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" /> Add your first city
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CityDeleteDialog
        cityId={pendingDelete?.id ?? null}
        cityName={pendingDelete?.name ?? null}
        open={pendingDelete !== null}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        onDeleted={async () => {
          setPendingDelete(null);
          await refetch();
        }}
      />
      <CityRestoreDialog
        cityId={pendingRestore?.id ?? null}
        cityName={pendingRestore?.name ?? null}
        open={pendingRestore !== null}
        onOpenChange={(o) => { if (!o) setPendingRestore(null); }}
        onRestored={async () => {
          setPendingRestore(null);
          await refetch();
        }}
      />
    </div>
  );
}
