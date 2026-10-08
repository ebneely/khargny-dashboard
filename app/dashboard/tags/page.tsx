'use client';

import { StatusBadge } from '@/components/admin/subscriber-ui';
import { RecordCell } from '@/components/admin/record-cell';
import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { useAdminTags } from '@/lib/api/hooks/use-admin-tags';
import { EntityDeleteDialog } from '@/components/admin/entity-delete-dialog';
import { useDashboardLang } from '@/lib/dashboard-lang';

export default function TagsPage() {
  const controlCopy = useDashboardCopy();
  const { lang, pick } = useDashboardLang();
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const { data, isLoading, isError, refetch } = useAdminTags();

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.nameEn && t.nameEn.toLowerCase().includes(q)) ||
        t.slug.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Tags</DashboardText></h1>
        <Link href="/dashboard/tags/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <DashboardText>Add Tag</DashboardText>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={controlCopy("Search tags...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
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
              <p className="text-muted-foreground mb-3"><DashboardText>Failed to load tags</DashboardText></p>
              <Button variant="outline" onClick={() => refetch()}><DashboardText>Retry</DashboardText></Button>
            </div>
          ) : filtered.length > 0 ? (
            <Table layout="list">
              <TableHeader>
                <TableRow>
                  <TableHead><DashboardText>Name</DashboardText></TableHead>
                  <TableHead><DashboardText>Slug</DashboardText></TableHead>
                  <TableHead column="status"><DashboardText>Status</DashboardText></TableHead>
                  <TableHead className="text-end" column="actions"><DashboardText>Actions</DashboardText></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <Link href={`/dashboard/tags/${tag.id}`} className="hover:text-primary font-medium">
                        <RecordCell nameAr={tag.name} nameEn={tag.nameEn} />
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tag.slug}</TableCell>
                    <TableCell column="status"><StatusBadge status={tag.deletedAt ? 'deleted' : 'active'} /></TableCell>
                      <TableCell className="text-end" column="actions">
                      <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href={`/dashboard/tags/${tag.id}`} />} aria-label={`${lang === 'ar' ? 'تعديل' : 'Edit'} ${pick(tag.name, tag.nameEn)}`}><Pencil aria-hidden="true" /></Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="hover:text-destructive focus-visible:text-destructive"
                        aria-label={`${lang === 'ar' ? 'حذف' : 'Delete'} ${pick(tag.name, tag.nameEn)}`}
                        onClick={() => setPendingDelete({ id: tag.id, name: tag.name })}
                        data-trace-id={`tag-list-delete-${tag.id}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground"><DashboardText>No tags found</DashboardText></p>
              <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/tags/new" />} className="mt-3"><DashboardText>Add Tag</DashboardText></Button>
            </div>
          )}
        </CardContent>
      </Card>

      <EntityDeleteDialog
        endpoint="/v1/admin/tags"
        entityLabel="tag"
        entityId={pendingDelete?.id ?? null}
        entityName={pendingDelete?.name ?? null}
        open={pendingDelete !== null}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        onDeleted={async () => { setPendingDelete(null); await refetch(); }}
        consequence="This removes the tag from the catalog and from every place it was assigned to."
        traceId="tag-delete-dialog"
      />
    </div>
  );
}
