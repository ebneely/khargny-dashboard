'use client';

import { useDashboardReadOnly } from '@/components/auth/read-only-gate';
import { RowActions } from '@/components/admin/row-actions';
import { FilterBar, FilterSearch } from '@/components/admin/filter-bar';
import { RecordCell } from '@/components/admin/record-cell';
import { Pager } from '@/components/admin/pager';
import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { useAdminCategories } from '@/lib/api/hooks/use-admin-categories';
import { StatusBadge } from '@/components/admin/subscriber-ui';
import { CategoryDeleteDialog } from '@/components/admin/category-delete-dialog';

const PAGE_SIZE = 20;

export default function CategoriesPage() {
  const controlCopy = useDashboardCopy();
  const readOnly = useDashboardReadOnly();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const skip = page * PAGE_SIZE;
  const { data, isLoading, isError, refetch } = useAdminCategories();

  const items = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) =>
        c.nameAr.toLowerCase().includes(q) ||
        (c.nameEn && c.nameEn.toLowerCase().includes(q)) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(skip, skip + PAGE_SIZE);

  return (
    <div>
      <nav aria-label={controlCopy("Breadcrumb")} className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground"><DashboardText>Dashboard</DashboardText></Link>
        <span className="mx-2">/</span>
        <span className="text-foreground"><DashboardText>Categories</DashboardText></span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Categories</DashboardText></h1>
        <Link href="/dashboard/categories/new">
          <Button className="gap-2" data-trace-id="category-list-add">
            <Plus className="w-4 h-4" />
            <DashboardText>Add Category</DashboardText>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader><FilterBar filters={0}><FilterSearch label="Search categories..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} /></FilterBar></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3" role="alert"><DashboardText>Failed to load categories</DashboardText></p>
              <Button variant="outline" onClick={() => refetch()}><DashboardText>Retry</DashboardText></Button>
            </div>
          ) : paged.length > 0 ? (
            <>
              <Table layout="list">
                <TableHeader>
                  <TableRow>
                    <TableHead><DashboardText>Name</DashboardText></TableHead>
                    <TableHead><DashboardText>Slug</DashboardText></TableHead>
                    <TableHead><DashboardText>Icon</DashboardText></TableHead>
                    <TableHead column="status"><DashboardText>Status</DashboardText></TableHead>
                    <TableHead column="actions" className="text-end"><DashboardText>Actions</DashboardText></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/categories/${cat.id}/edit`}
                          className="hover:text-primary font-medium"
                          data-trace-id={`category-list-name-${cat.id}`}
                        >
                          <RecordCell nameAr={cat.nameAr} nameEn={cat.nameEn} />
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                      <TableCell className="text-muted-foreground">{cat.icon || '—'}</TableCell>
                      <TableCell column="status"><StatusBadge status={cat.status} />
                      </TableCell>
                      <TableCell column="actions" className="text-end"><RowActions recordName={cat.nameAr} actions={[
                        { label: readOnly ? 'View' : 'Edit', icon: <Pencil aria-hidden="true" />, href: `/dashboard/categories/${cat.id}/edit`, traceId: `category-list-edit-${cat.id}` },
                        ...(!readOnly ? [{ label: 'Delete', icon: <Trash2 aria-hidden="true" />, destructive: true, onClick: () => setPendingDelete({ id: cat.id, name: cat.nameAr }), traceId: `category-list-delete-${cat.id}` }] : []),
                      ]} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Pager skip={page * PAGE_SIZE} pageSize={PAGE_SIZE} total={filtered.length} count={paged.length} onPrevious={() => setPage((current) => Math.max(0, current - 1))} onNext={() => setPage((current) => current + 1)} nextDisabled={page >= totalPages - 1} />
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {search ? 'No categories match your search.' : 'No categories found.'}
              </p>
              {!search && (
                <Link href="/dashboard/categories/new" className="inline-block mt-3">
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" /> <DashboardText>Add your first category</DashboardText>
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryDeleteDialog
        categoryId={pendingDelete?.id ?? null}
        categoryName={pendingDelete?.name ?? null}
        open={pendingDelete !== null}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        onDeleted={async () => {
          setPendingDelete(null);
          await refetch();
        }}
      />
    </div>
  );
}
