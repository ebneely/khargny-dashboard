'use client';

import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { RowActions } from '@/components/admin/row-actions';
import { FilterBar, FilterSearch, FilterSelect } from '@/components/admin/filter-bar';
import { RecordCell } from '@/components/admin/record-cell';
import { Pager } from '@/components/admin/pager';
import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, RotateCcw, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { useAdminCities } from '@/lib/api/hooks/use-admin-cities';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { StatusBadge } from '@/components/admin/subscriber-ui';
import { CityDeleteDialog } from '@/components/admin/city-delete-dialog';
import { CityRestoreDialog } from '@/components/admin/city-restore-dialog';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | 'active' | 'draft' | 'deleted';

export default function CitiesPage() {
  const controlCopy = useDashboardCopy();
  const readOnly = useDashboardReadOnly();
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
      <nav aria-label={controlCopy("Breadcrumb")} className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground"><DashboardText>Dashboard</DashboardText></Link>
        <span className="mx-2">/</span>
        <span className="text-foreground"><DashboardText>Cities</DashboardText></span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Cities</DashboardText></h1>
        <Link href="/dashboard/cities/new">
          <Button className="gap-2" data-trace-id="city-list-add">
            <Plus className="w-4 h-4" />
            <DashboardText>Add City</DashboardText>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader><FilterBar filters={1}><FilterSearch label="Search by name, name (En), or slug..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} data-trace-id="city-list-search" /><FilterSelect label="Any status" value={statusFilter} onValueChange={(value) => { setStatusFilter(value as StatusFilter); setPage(0); }} options={[{ value: 'all', label: 'Any status' }, { value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'deleted', label: 'Deleted' }]} /></FilterBar></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3" role="alert"><DashboardText>Failed to load cities</DashboardText></p>
              <Button variant="outline" onClick={() => refetch()}><DashboardText>Retry</DashboardText></Button>
            </div>
          ) : filtered.length > 0 ? (
            <>
              <Table layout="list">
                <TableHeader>
                  <TableRow>
                    <TableHead><DashboardText>Name</DashboardText></TableHead>
                    <TableHead><DashboardText>Slug</DashboardText></TableHead>
                    <TableHead><DashboardText>Region</DashboardText></TableHead>
                    <TableHead className="text-end"><DashboardText>Places</DashboardText></TableHead>
                    <TableHead column="status"><DashboardText>Status</DashboardText></TableHead>
                    <TableHead className="text-center"><DashboardText>Featured</DashboardText></TableHead>
                    <TableHead column="actions" className="text-end"><DashboardText>Actions</DashboardText></TableHead>
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
                            className="hover:text-primary font-medium"
                            data-trace-id={`city-list-name-${city.id}`}
                          >
                            <RecordCell nameAr={city.name} nameEn={city.nameEn} thumbnail={city.imageUrl} />
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{city.slug}</TableCell>
                        <TableCell className="text-muted-foreground">{city.region || '—'}</TableCell>
                        <TableCell className="text-end tabular-nums text-sm">
                          {(city.placeCount ?? 0) > 0 ? (
                            <span title={`${city.activePlaceCount ?? 0} active of ${city.placeCount} total`}>
                              {city.placeCount}
                              <span className="text-muted-foreground"> ({city.activePlaceCount ?? 0} <DashboardText>active)</DashboardText></span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell column="status">{deletedAt ? (
                            <StatusBadge status="deleted" data-trace-id={`city-list-status-deleted-${city.id}`} />
                          ) : (
                            <StatusBadge status={city.status} />
                          )}
                        </TableCell>
                        <TableCell className="text-center">{city.featured ? '✓' : '—'}</TableCell>
                        <TableCell column="actions" className="text-end"><RowActions recordName={city.name} actions={[
                          { label: readOnly ? 'View' : 'Edit', icon: <Pencil aria-hidden="true" />, href: `/dashboard/cities/${city.id}`, traceId: `city-list-edit-${city.id}` },
                          ...(deletedAt && isSuperadmin && !readOnly ? [{ label: 'Restore', icon: <RotateCcw aria-hidden="true" />, onClick: () => setPendingRestore({ id: city.id, name: city.name }), traceId: `city-list-restore-${city.id}` }] : !deletedAt && !readOnly ? [{ label: 'Delete', icon: <Trash2 aria-hidden="true" />, destructive: true, onClick: () => setPendingDelete({ id: city.id, name: city.name }), traceId: `city-list-delete-${city.id}` }] : []),
                        ]} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Pager skip={page * PAGE_SIZE} pageSize={PAGE_SIZE} total={data?.total ?? 0} count={filtered.length} onPrevious={() => setPage((current) => Math.max(0, current - 1))} onNext={() => setPage((current) => current + 1)} nextDisabled={page >= totalPages - 1} />
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {search ? 'No cities match your search.' : 'No cities found.'}
              </p>
              {!search && (
                <Link href="/dashboard/cities/new" className="inline-block mt-3">
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" /> <DashboardText>Add your first city</DashboardText>
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
