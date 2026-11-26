'use client';

import { PageActions } from '@/components/admin/page-actions';

import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { useState } from 'react';
import { FormActionBar } from '@/components/admin/form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { slugForForm } from '@/lib/form-slug';
import { useParams } from 'next/navigation';
import { useRouter } from '@/lib/dash-router';
import Link from '@/components/lang-link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAdminCity } from '@/lib/api/hooks/use-admin-cities';
import { useAdminCities } from '@/lib/api/hooks/use-admin-cities';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { adminApi } from '@/lib/api/admin-client';
import { CityDeleteDialog } from '@/components/admin/city-delete-dialog';
import { CityRestoreDialog } from '@/components/admin/city-restore-dialog';
import { CityAreasPicker } from '@/components/admin/city-areas-picker';
import { CityLiveAreas } from '@/components/admin/city-live-areas';
import { CityImageUpload } from '@/components/admin/city-image-upload';
import { StatusBadge } from '@/components/admin/subscriber-ui';
import type { AdminApiError } from '@/lib/api/admin-client';

type CityDraft = {
  name: string;
  nameEn: string;
  slug: string;
  areaKeys: string[];
  descriptionAr: string;
  descriptionEn: string;
  featured: boolean;
  status: string;
  imageUrl: string | null;
};

export default function EditCityPage() {
  const controlCopy = useDashboardCopy();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: city, isLoading, isError, refetch } = useAdminCity(id);
  const { data: citiesList } = useAdminCities({ limit: 100 });
  const { data: session } = useCurrentSession();
  const isSuperadmin = session?.user.role === 'super_admin';

  const [error, setError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  // Field edits overlay the loaded city, so the form needs no effect to seed it. The edits are
  // tied to the record version they were made against: when a save comes back with a new
  // updatedAt, they are dropped in the same render as the refetched city, so the fields show
  // what the server stored — no flash of the old values, and the saved slug is never swapped
  // for the generated one on a later save.
  const cityVersion = city ? `${city.id}:${city.updatedAt}` : null;
  const [draftState, setDraftState] = useState<{ version: string | null; values: Partial<CityDraft> } | null>(null);
  const draft: Partial<CityDraft> = draftState && draftState.version === cityVersion ? draftState.values : {};
  const edit = <K extends keyof CityDraft>(key: K, value: CityDraft[K]) =>
    setDraftState((state) => ({
      version: cityVersion,
      values: { ...(state && state.version === cityVersion ? state.values : {}), [key]: value },
    }));
  const name = draft.name ?? city?.name ?? '';
  const nameEn = draft.nameEn ?? city?.nameEn ?? '';
  // Editing either name regenerates the slug, until the admin types a slug of their own.
  const nameEdited = draft.name !== undefined || draft.nameEn !== undefined;
  const slug = slugForForm({ draft, loadedSlug: city?.slug ?? '', nameEdited, name, nameEn });
  const areaKeys = draft.areaKeys ?? city?.areaKeys ?? [];
  const descriptionAr = draft.descriptionAr ?? city?.descriptionAr ?? '';
  const descriptionEn = draft.descriptionEn ?? city?.descriptionEn ?? '';
  const featured = draft.featured ?? city?.featured ?? false;
  const status = draft.status ?? city?.status ?? 'draft';
  const imageUrl = draft.imageUrl ?? (city as { imageUrl?: string | null } | null)?.imageUrl ?? null;

  const formChanges = useFormChanges({ name, nameEn, slug, areaKeys, descriptionAr, descriptionEn, featured, status }, { name: city?.name, nameEn: city?.nameEn || '', slug: city?.slug, areaKeys: city?.areaKeys ?? [], descriptionAr: city?.descriptionAr || '', descriptionEn: city?.descriptionEn || '', featured: city?.featured, status: city?.status });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSlugError('');
    if (!nameEn.trim()) {
      setError('English name is required so the city is never Arabic-only on the English UI.');
      return;
    }
    setSaving(true);
    try {
      await adminApi.patch(`/v1/admin/cities/${id}`, {
        name, nameEn: nameEn || undefined, slug,
        areaKeys,
        descriptionAr: descriptionAr || undefined, descriptionEn: descriptionEn || undefined,
        featured, status,
      });
      setError('');
      await refetch();
      formChanges.markSaved();
    } catch (e) {
      const err = e as AdminApiError;
      if (err.status === 409) {
        setSlugError('This slug is already in use. Please choose a different one.');
      } else {
        setError(err.message || 'Failed to update city');
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (isError || !city) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-3" role="alert"><DashboardText>City not found</DashboardText></p>
        <Link href="/dashboard/places/library/cities">
          <Button variant="outline"><DashboardText>Back to cities</DashboardText></Button>
        </Link>
      </div>
    );
  }

  const deletedAt = (city as { deletedAt?: string | null }).deletedAt ?? null;
  const parentId = (city as { parentCityId?: string | null }).parentCityId ?? null;
  const parentName = parentId
    ? citiesList?.items.find((c) => c.id === parentId)?.name ?? '—'
    : '—';

  return (
    <div>
      <nav aria-label={controlCopy("Breadcrumb")} className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground"><DashboardText>Dashboard</DashboardText></Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/places/library/cities" className="hover:text-foreground"><DashboardText>Cities</DashboardText></Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{city.name}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Edit City</DashboardText></h1>
          {deletedAt ? (
            <StatusBadge status="deleted" data-trace-id="edit-city-status-deleted" />
          ) : (
            <StatusBadge status={city.status} />
          )}
        </div>
        <div className="flex gap-2">
          {deletedAt && isSuperadmin ? (
            <PageActions form actions={[{ label: "Restore", onClick: () => setRestoreOpen(true), traceId: "edit-city-restore" }]} />
          ) : !deletedAt ? (
            <PageActions form actions={[{ label: "Delete", onClick: () => setDeleteOpen(true), traceId: "edit-city-delete" }]} />
          ) : null}
          <PageActions form actions={[{ label: "Cancel", href: "/dashboard/places/library/cities", readOnly: true }]} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle><DashboardText>City Details</DashboardText></CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name"><DashboardText>Name (Arabic) *</DashboardText></Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => edit('name', e.target.value)}
                  data-trace-id="edit-city-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn"><DashboardText>Name (English) *</DashboardText></Label>
                <Input
                  id="nameEn"
                  value={nameEn}
                  onChange={(e) => edit('nameEn', e.target.value)}
                  data-trace-id="edit-city-name-en"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slug"><DashboardText>Slug *</DashboardText></Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => { edit('slug', e.target.value); setSlugError(''); }}
                  data-trace-id="edit-city-slug"
                  aria-invalid={!!slugError}
                  aria-describedby={slugError ? 'edit-city-slug-error' : undefined}
                  required
                />
                {slugError && (
                  <p id="edit-city-slug-error" className="text-sm text-destructive" data-trace-id="edit-city-slug-error" role="alert">
                    {slugError}
                  </p>
                )}
              </div>
            </div>

            {/* The regions (areas) this city offers — ONE control. Region and area are the
                same thing (a district inside the governorate); the old separate single
                "Region (governorate)" picker was a confusing duplicate and is gone. A place
                in the city picks its region from exactly this set. */}
            <div className="space-y-2">
              <Label><DashboardText>Regions / areas in this city</DashboardText></Label>
              <CityAreasPicker governorate={nameEn || undefined} value={areaKeys} onChange={(keys) => edit('areaKeys', keys)} />
              <CityLiveAreas cityId={id} />
            </div>

            <div className="space-y-2">
              <Label><DashboardText>Cover photo</DashboardText></Label>
              <CityImageUpload cityId={id} imageUrl={imageUrl} onChange={(url) => edit('imageUrl', url)} />
            </div>

            <div className="space-y-2">
              <Label><DashboardText>Parent city</DashboardText></Label>
              <p className="text-sm text-muted-foreground" data-trace-id="edit-city-parent-display">
                {parentName}
                {parentId && deletedAt ? ' (parent deleted; this area is now top-level)' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="descriptionAr"><DashboardText>Description (Arabic)</DashboardText></Label>
                <Input
                  id="descriptionAr"
                  value={descriptionAr}
                  onChange={(e) => edit('descriptionAr', e.target.value)}
                  data-trace-id="edit-city-desc-ar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn"><DashboardText>Description (English)</DashboardText></Label>
                <Input
                  id="descriptionEn"
                  value={descriptionEn}
                  onChange={(e) => edit('descriptionEn', e.target.value)}
                  data-trace-id="edit-city-desc-en"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="featured"
                  checked={featured}
                  onCheckedChange={(v) => edit('featured', v === true)}
                  data-trace-id="edit-city-featured"
                />
                <Label htmlFor="featured"><DashboardText>Featured</DashboardText></Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status"><DashboardText>Status</DashboardText></Label>
                <Select value={status} onValueChange={(v) => v && edit('status', v)}>
                  <SelectTrigger className="w-32" data-trace-id="edit-city-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft"><DashboardText>Draft</DashboardText></SelectItem>
                    <SelectItem value="active"><DashboardText>Active</DashboardText></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <FormActionBar dirty={formChanges.dirty} saving={saving} error={error || slugError} disabled={saving} cancelHref="/dashboard/places/library/cities" traceId="edit-city-save" />
            </div>
          </form>
        </CardContent>
      </Card>

      <CityDeleteDialog
        cityId={city.id}
        cityName={city.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push('/dashboard/places/library/cities')}
      />
      <CityRestoreDialog
        cityId={city.id}
        cityName={city.name}
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        onRestored={async () => { await refetch(); }}
      />
    </div>
  );
}
