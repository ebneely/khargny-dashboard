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
import { useAdminAmenities } from '@/lib/api/hooks/use-admin-amenities';
import { EntityDeleteDialog } from '@/components/admin/entity-delete-dialog';
import { IconPreview } from '@/components/icon-picker';
import { useDashboardLang } from '@/lib/dashboard-lang';

export default function AmenitiesPage() {
  const controlCopy = useDashboardCopy();
  const { lang, pick } = useDashboardLang();
  const [search, setSearch] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const { data, isLoading, isError, refetch } = useAdminAmenities();

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.nameEn && a.nameEn.toLowerCase().includes(q)),
    );
  }, [data, search]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Amenities</DashboardText></h1>
        <Link href="/dashboard/amenities/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            <DashboardText>Add Amenity</DashboardText>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={controlCopy("Search amenities...")}
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
              <p className="text-muted-foreground mb-3"><DashboardText>Failed to load amenities</DashboardText></p>
              <Button variant="outline" onClick={() => refetch()}><DashboardText>Retry</DashboardText></Button>
            </div>
          ) : filtered.length > 0 ? (
            <Table layout="list">
              <TableHeader>
                <TableRow>
                  <TableHead><DashboardText>Name</DashboardText></TableHead>
                  <TableHead><DashboardText>Icon</DashboardText></TableHead>
                  <TableHead column="status"><DashboardText>Status</DashboardText></TableHead>
                  <TableHead className="text-end" column="actions"><DashboardText>Actions</DashboardText></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((amenity) => (
                  <TableRow key={amenity.id}>
                    <TableCell>
                      <Link href={`/dashboard/amenities/${amenity.id}`} className="hover:text-primary font-medium">
                        <RecordCell nameAr={amenity.name} nameEn={amenity.nameEn} />
                      </Link>
                    </TableCell>
                    {/* Show the glyph, not the raw name — the icon is what visitors see. */}
                    <TableCell className="text-muted-foreground">
                      {amenity.icon ? (
                        <span className="inline-flex items-center gap-2">
                          <IconPreview name={amenity.icon} size={16} />
                          <span className="text-xs">{amenity.icon}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell column="status"><StatusBadge status={amenity.deletedAt ? 'deleted' : 'active'} /></TableCell>
                      <TableCell className="text-end" column="actions">
                      <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href={`/dashboard/amenities/${amenity.id}`} />} aria-label={`${lang === 'ar' ? 'تعديل' : 'Edit'} ${pick(amenity.name, amenity.nameEn)}`}><Pencil aria-hidden="true" /></Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="hover:text-destructive focus-visible:text-destructive"
                        aria-label={`${lang === 'ar' ? 'حذف' : 'Delete'} ${pick(amenity.name, amenity.nameEn)}`}
                        onClick={() => setPendingDelete({ id: amenity.id, name: amenity.name })}
                        data-trace-id={`amenity-list-delete-${amenity.id}`}
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
              <p className="text-muted-foreground"><DashboardText>No amenities found</DashboardText></p>
              <Button variant="outline" nativeButton={false} render={<Link href="/dashboard/amenities/new" />} className="mt-3"><DashboardText>Add Amenity</DashboardText></Button>
            </div>
          )}
        </CardContent>
      </Card>

      <EntityDeleteDialog
        endpoint="/v1/admin/amenities"
        entityLabel="amenity"
        entityId={pendingDelete?.id ?? null}
        entityName={pendingDelete?.name ?? null}
        open={pendingDelete !== null}
        onOpenChange={(o) => { if (!o) setPendingDelete(null); }}
        onDeleted={async () => { setPendingDelete(null); await refetch(); }}
        consequence="This removes the amenity from the catalog and from every place it was assigned to."
        traceId="amenity-delete-dialog"
      />
    </div>
  );
}
