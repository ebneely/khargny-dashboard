'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
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

export default function AmenitiesPage() {
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Amenities</h1>
        <Link href="/dashboard/amenities/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Amenity
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search amenities..."
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
              <p className="text-muted-foreground mb-3">Failed to load amenities</p>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>English Name</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((amenity) => (
                  <TableRow key={amenity.id}>
                    <TableCell>
                      <Link href={`/dashboard/amenities/${amenity.id}`} className="hover:text-orange-600 font-medium">
                        {amenity.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{amenity.nameEn || '—'}</TableCell>
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
                    <TableCell className="text-right">
                      <Link href={`/dashboard/amenities/${amenity.id}`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete ${amenity.name}`}
                        onClick={() => setPendingDelete({ id: amenity.id, name: amenity.name })}
                        data-trace-id={`amenity-list-delete-${amenity.id}`}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No amenities found</p>
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
