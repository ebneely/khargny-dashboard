'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { useAdminCategories } from '@/lib/api/hooks/use-admin-categories';
import { Badge } from '@/components/ui/badge';
import { CategoryDeleteDialog } from '@/components/admin/category-delete-dialog';

const PAGE_SIZE = 20;

export default function CategoriesPage() {
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
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Categories</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground">Categories</h1>
        <Link href="/dashboard/categories/new">
          <Button className="gap-2" data-trace-id="category-list-add">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
                data-trace-id="category-list-search"
              />
            </div>
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
              <p className="text-muted-foreground mb-3" role="alert">Failed to load categories</p>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : paged.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arabic Name</TableHead>
                    <TableHead>English Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/categories/${cat.id}/edit`}
                          className="hover:text-orange-600 font-medium"
                          data-trace-id={`category-list-name-${cat.id}`}
                        >
                          {cat.nameAr}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{cat.nameEn || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{cat.slug}</TableCell>
                      <TableCell className="text-muted-foreground">{cat.icon || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={cat.status === 'active' ? 'default' : 'secondary'}>
                          {cat.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/dashboard/categories/${cat.id}/edit`}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit"
                              data-trace-id={`category-list-edit-${cat.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete"
                            onClick={() => setPendingDelete({ id: cat.id, name: cat.nameAr })}
                            data-trace-id={`category-list-delete-${cat.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages} ({filtered.length} total)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Previous page"
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {search ? 'No categories match your search.' : 'No categories found.'}
              </p>
              {!search && (
                <Link href="/dashboard/categories/new" className="inline-block mt-3">
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" /> Add your first category
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
