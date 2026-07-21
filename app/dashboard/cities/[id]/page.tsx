'use client';

import { useState, useEffect } from 'react';
import { autoSlug } from '@/lib/utils/slug';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Trash2, RotateCcw } from 'lucide-react';
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
import { CityImageUpload } from '@/components/admin/city-image-upload';
import { Badge } from '@/components/ui/badge';
import type { AdminApiError } from '@/lib/api/admin-client';

export default function EditCityPage() {
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

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [nameEdited, setNameEdited] = useState(false);
  const [areaKeys, setAreaKeys] = useState<string[]>([]);
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState('draft');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (city) {
      setName(city.name);
      setNameEn(city.nameEn || '');
      setSlug(city.slug);
      setAreaKeys(city.areaKeys ?? []);
      setDescriptionAr(city.descriptionAr || '');
      setDescriptionEn(city.descriptionEn || '');
      setFeatured(city.featured);
      setStatus(city.status);
      setImageUrl((city as { imageUrl?: string | null }).imageUrl ?? null);
    }
  }, [city]);

  // Auto-regenerate the slug from the name — but ONLY after the admin actually edits the name
  // (nameEdited), and only until they hand-edit the slug (slugTouched). This matches the create
  // form's behavior without clobbering the loaded slug on initial hydration.
  useEffect(() => {
    if (!nameEdited || slugTouched) return;
    setSlug(autoSlug(name, nameEn));
  }, [name, nameEn, nameEdited, slugTouched]);

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
    } catch (e: any) {
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
        <p className="text-muted-foreground mb-3" role="alert">City not found</p>
        <Link href="/dashboard/cities">
          <Button variant="outline">Back to cities</Button>
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
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/cities" className="hover:text-foreground">Cities</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{city.name}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-foreground">Edit City</h1>
          {deletedAt ? (
            <Badge variant="destructive" data-trace-id="edit-city-status-deleted">Deleted</Badge>
          ) : (
            <Badge variant={city.status === 'active' ? 'default' : 'secondary'}>
              {city.status}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {deletedAt && isSuperadmin ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setRestoreOpen(true)}
              data-trace-id="edit-city-restore"
            >
              <RotateCcw className="w-4 h-4" /> Restore
            </Button>
          ) : !deletedAt ? (
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => setDeleteOpen(true)}
              data-trace-id="edit-city-delete"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          ) : null}
          <Link href="/dashboard/cities">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>City Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name (Arabic) *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameEdited(true); }}
                  data-trace-id="edit-city-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">Name (English) *</Label>
                <Input
                  id="nameEn"
                  value={nameEn}
                  onChange={(e) => { setNameEn(e.target.value); setNameEdited(true); }}
                  data-trace-id="edit-city-name-en"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); setSlugError(''); }}
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
              <Label>Regions / areas in this city</Label>
              <CityAreasPicker governorate={nameEn || undefined} value={areaKeys} onChange={setAreaKeys} />
            </div>

            <div className="space-y-2">
              <Label>Cover photo</Label>
              <CityImageUpload cityId={id} imageUrl={imageUrl} onChange={setImageUrl} />
            </div>

            <div className="space-y-2">
              <Label>Parent city</Label>
              <p className="text-sm text-muted-foreground" data-trace-id="edit-city-parent-display">
                {parentName}
                {parentId && deletedAt ? ' (parent deleted; this area is now top-level)' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="descriptionAr">Description (Arabic)</Label>
                <Input
                  id="descriptionAr"
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  data-trace-id="edit-city-desc-ar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">Description (English)</Label>
                <Input
                  id="descriptionEn"
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  data-trace-id="edit-city-desc-en"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="featured"
                  checked={featured}
                  onCheckedChange={(v) => setFeatured(v === true)}
                  data-trace-id="edit-city-featured"
                />
                <Label htmlFor="featured">Featured</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger className="w-32" data-trace-id="edit-city-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving} data-trace-id="edit-city-save">
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Link href="/dashboard/cities">
                <Button type="button" variant="outline" data-trace-id="edit-city-cancel">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <CityDeleteDialog
        cityId={city.id}
        cityName={city.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push('/dashboard/cities')}
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
