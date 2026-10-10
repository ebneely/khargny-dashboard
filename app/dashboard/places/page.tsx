'use client';

import { placeStatusFilters, canDeactivatePlace } from '@/lib/place-public-state';
import { useListAddress } from '@/components/admin/record-list';
import { engagementNumber } from '@/lib/engagement';
import { PlaceBulkStatus } from '@/components/admin/place-bulk-status';
import { Checkbox } from '@/components/ui/checkbox';
import type { AdminPlace } from '@/lib/api/types';
import { placeCover } from '@/lib/place-list';
import { useDashboardCopy } from '@/components/admin/dashboard-text';
import { PageActions } from '@/components/admin/page-actions';

import { DashboardText } from '@/components/admin/dashboard-text';
import { RecordCell } from '@/components/admin/record-cell';
import { Pager } from '@/components/admin/pager';
import { RowActions } from '@/components/admin/row-actions';
import { FilterBar, FilterSearch, FilterSelect } from '@/components/admin/filter-bar';
import { PlaceOwnerFilter } from '@/components/admin/place-owner-filter';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, RotateCcw, Pencil, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { useAdminPlaces } from '@/lib/api/hooks/use-admin-places';
import { useAdminCities } from '@/lib/api/hooks/use-admin-cities';
import { useAdminCategories } from '@/lib/api/hooks/use-admin-categories';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { priceBandLabel } from '@/lib/price-bands';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { PlacePublicStatus } from '@/components/admin/place-public-status';
import { PlaceDeleteDialog } from '@/components/admin/place-delete-dialog';
import { PlaceRestoreDialog } from '@/components/admin/place-restore-dialog';


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

export default function PlacesPage() {
  const address = useListAddress('places');
  const copy = useDashboardCopy();
  const PAGE_SIZE = address.limit;
  const sortBy = address.get('sort');
  const filterKey = JSON.stringify([address.query, address.get('status'), address.get('city'), address.get('category'), address.get('media'), address.get('owner'), sortBy]);
  const [selection, setSelection] = useState<{ key: string; records: AdminPlace[] }>({ key: '', records: [] });
  if (selection.key !== filterKey) setSelection({ key: filterKey, records: [] });
  const selected = selection.key === filterKey ? selection.records : [];
  const [bulkBusy, setBulkBusy] = useState(false);
  const select = (place: AdminPlace, checked: boolean) => setSelection(current => { const records = current.key === filterKey ? current.records : []; return { key: filterKey, records: checked ? [...records.filter(row => row.id !== place.id), place].slice(0, 100) : records.filter(row => row.id !== place.id) }; });
  const search = address.get('q', '');
  const setSearch = (value: string) => address.change('q', value);
  // Name column follows the GLOBAL dashboard language toggle (in the header), not a
  // per-page one — the local EN/ع toggle here was a duplicate of it.
  const { lang } = useDashboardLang();
  const statusFilter = address.get('status', 'all');
  const setStatusFilter = (value: string) => address.change('status', value);
  const cityFilter = address.get('city', 'all');
  const setCityFilter = (value: string) => address.change('city', value);
  const categoryFilter = address.get('category', 'all');
  const setCategoryFilter = (value: string) => address.change('category', value);
  const mediaFilter = address.get('media', 'all');
  const setMediaFilter = (value: string) => address.change('media', value);
  const ownerFilter = address.get('owner', 'all');
  const setOwnerFilter = (value: string) => address.change('owner', value);
  const page = Math.floor(address.skip / PAGE_SIZE);
  const setPage = (next: number | ((current: number) => number)) => address.change('skip', String(Math.max(0, typeof next === 'function' ? next(page) : next) * PAGE_SIZE));

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ id: string; name: string } | null>(null);

  // Filter options. Cities and categories are small, fixed lists, so one fetch each.
  const { data: cityData } = useAdminCities({ limit: 100 });
  const { data: categoryData } = useAdminCategories();

  const { data, isLoading, isError, refetch } = useAdminPlaces({
    sortBy: sortBy === 'likes' ? 'likes' : undefined,
    subscriberId: ownerFilter === 'all' ? undefined : ownerFilter,
    search: search || undefined,
    ...placeStatusFilters(statusFilter, mediaFilter),
    cityId: cityFilter === 'all' ? undefined : cityFilter,
    categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });
  const { data: session } = useCurrentSession();
  const isSuperadmin = session?.user.role === 'super_admin';
  const canWrite = isSuperadmin || session?.user.role === 'admin';

  const visibleItems = (() => {
    const items = data?.items ?? [];
    if (statusFilter !== 'deleted') return items;
    return items.filter((p) => p.deletedAt != null);
  })();

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const hasActiveFilters =
    search !== '' || statusFilter !== 'all' || cityFilter !== 'all' ||
    categoryFilter !== 'all' || mediaFilter !== 'all' || ownerFilter !== 'all';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Places</DashboardText></h1>
        <div className="flex flex-wrap items-center gap-3">
          <PageActions actions={[{ label: 'Add Place', href: '/dashboard/places/new', icon: <Plus className="size-4" aria-hidden="true" />, traceId: '' }]} />
        </div>
      </div>

      {canWrite && <PlaceBulkStatus key={filterKey} selected={selected.map(place => place.id)} records={selected} disabled={isLoading || isError} onBusy={setBulkBusy} refresh={refetch} onSelection={ids => setSelection({ key: filterKey, records: selected.filter(place => ids.includes(place.id)) })} />}
      <Card>
        <CardHeader>
          <FilterBar filters={6}><FilterSelect label="Sort places" value={sortBy || "default"} onValueChange={value => address.change('sort', value === 'default' ? '' : value)} options={[{ value: 'default', label: 'Default order' }, { value: 'likes', label: 'Most liked first' }]} />
            <FilterSearch label="Search places..." value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
            <FilterSelect label="Any status" value={statusFilter} onValueChange={(value) => { setStatusFilter(value); if (value === 'live' || value === 'not-shown') setMediaFilter('all'); setPage(0); }} options={[{ value: 'all', label: 'Any status' }, { value: 'live', label: 'Live' }, { value: 'not-shown', label: 'Active but not shown' }, { value: 'active', label: 'Any active place' }, { value: 'draft', label: 'Draft' }, ...((data?.items ?? []).some(canDeactivatePlace) || statusFilter === 'inactive' ? [{ value: 'inactive', label: 'Deactivated' }] : []), { value: 'deleted', label: 'Deleted' }]} />
            <FilterSelect label="Any city" value={cityFilter} onValueChange={(value) => { setCityFilter(value); setPage(0); }} options={[{ value: 'all', label: 'Any city' }, ...(cityData?.items ?? []).map((city) => ({ value: city.id, label: pickName(city.name, city.nameEn, lang) }))]} />
            <FilterSelect label="Any category" value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setPage(0); }} options={[{ value: 'all', label: 'Any category' }, ...(categoryData ?? []).map((category) => ({ value: category.id, label: pickName(category.nameAr, category.nameEn, lang) }))]} />
            <PlaceOwnerFilter value={ownerFilter} onChange={(value) => { setOwnerFilter(value); setPage(0); }} />
            <FilterSelect label="Any media" value={mediaFilter} onValueChange={(value) => { setMediaFilter(value);  setPage(0); }} options={[{ value: 'all', label: 'Any media' }, { value: 'with', label: 'Has media' }, { value: 'without', label: 'Needs media' }]} />
          </FilterBar>
          {hasActiveFilters && <Button data-ro-allow="true" variant="ghost" size="sm" className="self-start" onClick={() => { setSearch(''); setStatusFilter('all'); setCityFilter('all'); setCategoryFilter('all'); setMediaFilter('all'); setOwnerFilter('all'); setPage(0); }}><DashboardText>Clear</DashboardText></Button>}
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
              <p className="text-sm tabular-nums text-muted-foreground">{data?.total ?? 0} <DashboardText>places</DashboardText></p>
              <Table layout="places">
                <TableHeader><TableRow>
                  <TableHead data-place-field="identity"><div className="flex min-w-0 items-center gap-2">{canWrite && <Checkbox aria-label={copy('Select all places on this page')} disabled={bulkBusy || isLoading || isError || selected.filter(row => !visibleItems.some(place => place.id === row.id)).length + visibleItems.length > 100} indeterminate={visibleItems.some(place => selected.some(row => row.id === place.id)) && !visibleItems.every(place => selected.some(row => row.id === place.id))} checked={visibleItems.every(place => selected.some(row => row.id === place.id))} onCheckedChange={checked => setSelection({ key: filterKey, records: checked ? [...selected.filter(row => !visibleItems.some(place => place.id === row.id)), ...visibleItems].slice(0, 100) : selected.filter(row => !visibleItems.some(place => place.id === row.id)) })} />} <span className="block min-w-0 whitespace-nowrap" title={copy('Name')}><DashboardText>Name</DashboardText></span></div></TableHead>
                  <TableHead data-place-field="city"><span className="block min-w-0 whitespace-nowrap" title={copy('City · Category')}><DashboardText>City · Category</DashboardText></span></TableHead>
                  <TableHead data-place-field="owner"><span className="block min-w-0 whitespace-nowrap" title={copy('Owner')}><DashboardText>Owner</DashboardText></span></TableHead>
                  <TableHead data-place-field="price"><span className="block min-w-0 whitespace-nowrap" title={copy('Price')}><DashboardText>Price</DashboardText></span></TableHead>
                  <TableHead data-place-field="status" column="status"><span className="block min-w-0 whitespace-nowrap" title={copy('Status')}><DashboardText>Status</DashboardText></span></TableHead>
                  <TableHead data-place-field="likes" className="text-end"><span className="block min-w-0 whitespace-nowrap" title={copy('Likes')}><DashboardText>Likes</DashboardText></span></TableHead><TableHead data-place-field="saves" className="text-end"><span className="block min-w-0 whitespace-nowrap" title={copy('Saves')}><DashboardText>Saves</DashboardText></span></TableHead>
                  <TableHead data-place-field="views" className="text-end"><span className="block min-w-0 whitespace-nowrap" title={copy('Views')}><DashboardText>Views</DashboardText></span></TableHead>
                  <TableHead data-place-field="directions" className="text-end"><span className="block min-w-0 whitespace-nowrap" title={copy('5argny taps')}><DashboardText>5argny taps</DashboardText></span></TableHead>
                  <TableHead data-place-field="photos" className="text-end"><span className="block min-w-0 whitespace-nowrap" title={copy('Photos')}><DashboardText>Photos</DashboardText></span></TableHead>
                  <TableHead data-place-field="actions" column="actions" className="text-end"><span className="block min-w-0 whitespace-nowrap" title={copy('Actions')}><DashboardText>Actions</DashboardText></span></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {visibleItems.map((place) => {
                    const deletedAt = place.deletedAt ?? null;
                    return (
                    <TableRow key={place.id} data-place-id={place.id}>
                      <TableCell data-place-field="identity"><div className="flex items-start gap-2">{canWrite && <Checkbox aria-label={`${copy('Select place')}: ${pickName(place.name, place.nameEn, lang)}`} checked={selected.some(row => row.id === place.id)} disabled={bulkBusy || isLoading || isError || selected.length >= 100 && !selected.some(row => row.id === place.id)} onCheckedChange={checked => select(place, Boolean(checked))} />}
                        <Link href={`/dashboard/places/${place.id}`} className="min-w-0 flex-1 hover:text-primary font-medium" data-trace-id={`place-list-name-${place.id}`}>
                          <RecordCell nameAr={place.name} nameEn={place.nameEn} thumbnail={placeCover(place)} />
                        </Link></div><p data-slot="place-row-details" className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground tabular-nums">
                          <span data-place-detail="photos" title={`${copy('Photos')}: ${place._count?.images ?? copy('None')}`}>{copy('Photos')}: {place._count?.images ?? copy('None')}</span>
                          <span data-place-detail="price" title={`${copy('Price')}: ${place.priceRange ? priceBandLabel(place.priceRange, lang) : '—'}`}>{copy('Price')}: {place.priceRange ? priceBandLabel(place.priceRange, lang) : '—'}</span>
                          <span data-place-detail="owner" title={`${copy('Subscriber')}: ${place.subscriber?.name ?? '—'}`}>{copy('Subscriber')}: {place.subscriber?.name ?? '—'}</span>
                          <span data-place-detail="city" title={`${pickName(place.city?.name, place.city?.nameEn, lang)} · ${pickName(place.category?.nameAr, place.category?.nameEn, lang)}`}>{pickName(place.city?.name, place.city?.nameEn, lang)} · {pickName(place.category?.nameAr, place.category?.nameEn, lang)}</span>
                          <span data-place-detail="metrics">{copy('Likes')}: {engagementNumber(place.likeCount, lang)} · {copy('Saves')}: {place.saveCount ?? 0} · {copy('Views')}: {place.viewCount ?? 0} · {copy('5argny taps')}: {place.directionsCount ?? 0}</span>
                        </p>
                      </TableCell>
                      <TableCell data-place-field="city" className="text-muted-foreground"><p className="line-clamp-1 leading-4" title={pickName(place.city?.name, place.city?.nameEn, lang)}>{pickName(place.city?.name, place.city?.nameEn, lang)}</p><p className="line-clamp-1 leading-4" title={pickName(place.category?.nameAr, place.category?.nameEn, lang)}>{pickName(place.category?.nameAr, place.category?.nameEn, lang)}</p></TableCell>
                      <TableCell data-place-field="owner" className="text-muted-foreground">{place.subscriber ? <Link className="block truncate leading-4 hover:underline" title={place.subscriber.name} href={`/dashboard/subscribers/${place.subscriber.id}`}>{place.subscriber.name}</Link>: '—'}</TableCell>
                      <TableCell data-place-field="price" className="text-muted-foreground">{place.priceRange ? priceBandLabel(place.priceRange, lang) : '—'}</TableCell>
                      <TableCell data-place-field="status" column="status">
                        <PlacePublicStatus place={place} />
                      </TableCell>
                      <TableCell data-place-field="likes" className="text-end tabular-nums text-muted-foreground">{engagementNumber(place.likeCount, lang)}</TableCell>
                      <TableCell data-place-field="saves" className="text-end tabular-nums text-muted-foreground">{place.saveCount ?? 0}</TableCell>
                      <TableCell data-place-field="views" className="text-end tabular-nums text-muted-foreground">{place.viewCount ?? 0}</TableCell>
                      <TableCell data-place-field="directions" className="text-end tabular-nums text-muted-foreground">{place.directionsCount ?? 0}</TableCell>
                      <TableCell data-place-field="photos" className="text-end text-muted-foreground tabular-nums">{place._count?.images ?? <DashboardText>None</DashboardText>}</TableCell>
                      <TableCell data-place-field="metrics"><p data-slot="place-phone-metrics" className="text-xs leading-4 tabular-nums text-muted-foreground">{copy('Likes')}: {engagementNumber(place.likeCount, lang)} · {copy('Saves')}: {place.saveCount ?? 0} · {copy('Views')}: {place.viewCount ?? 0} · {copy('5argny taps')}: {place.directionsCount ?? 0}</p></TableCell>
                      <TableCell data-place-field="actions" column="actions" className="text-end">
                        <RowActions recordName={pickName(place.name, place.nameEn, lang)} actions={[
                          { label: canWrite ? 'Edit' : 'View', icon: <Pencil aria-hidden="true" />, href: `/dashboard/places/${place.id}`, traceId: `place-list-edit-${place.id}` },
                          ...(publicUrl(place) ? [{ label: 'View on the site', icon: <ExternalLink aria-hidden="true" />, href: publicUrl(place)!, external: true }] : []),
                          ...(canWrite ? [{ label: 'Edit pricing', icon: <Pencil aria-hidden="true" />, href: `/dashboard/places/${place.id}?tab=menu` }] : []),
                          ...(deletedAt && isSuperadmin ? [{ label: 'Restore', icon: <RotateCcw aria-hidden="true" />, onClick: () => setPendingRestore({ id: place.id, name: place.name }), traceId: `place-list-restore-${place.id}` }] : !deletedAt && canWrite ? [{ label: 'Delete', icon: <Trash2 aria-hidden="true" />, destructive: true, onClick: () => setPendingDelete({ id: place.id, name: place.name }), traceId: `place-list-delete-${place.id}` }] : []),
                        ]} />
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <Pager pageSizes={[10, 20, 50]} onPageSizeChange={size => address.change('limit', String(size))} skip={page * PAGE_SIZE} pageSize={PAGE_SIZE} total={data?.total ?? 0} count={visibleItems.length} onPrevious={() => setPage((current) => Math.max(0, current - 1))} onNext={() => setPage((current) => current + 1)} nextDisabled={page >= totalPages - 1} />
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
