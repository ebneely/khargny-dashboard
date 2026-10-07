'use client';

import { DashboardText } from '@/components/admin/dashboard-text';
import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { FormActionBar } from '@/components/admin/form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { ImagePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CityPicker } from '@/components/city-picker';
import { CityAreasPicker } from '@/components/admin/city-areas-picker';
import { adminApi } from '@/lib/api/admin-client';
import { autoSlug } from '@/lib/utils/slug';
import type { AdminApiError } from '@/lib/api/admin-client';

export default function NewCityPage() {
  const router = useRouter();
  const { lang } = useDashboardLang();
  const [error, setError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [areaKeys, setAreaKeys] = useState<string[]>([]);
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState('active');
  const [parentCityId, setParentCityId] = useState('');
  // Cover photo chosen on THIS form (not only after saving), buffered with a preview and
  // uploaded right after the city is created (the image endpoint needs the city id).
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const pickCover = (file: File | null) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  useEffect(() => {
    if (slugTouched) return;
    const generated = autoSlug(name, nameEn);
    setSlug(generated);
  }, [name, nameEn, slugTouched]);

  const formChanges = useFormChanges({ name, nameEn, slug, areaKeys, descriptionAr, descriptionEn, featured, status, parentCityId, coverFile: coverFile ? [coverFile.name, coverFile.size, coverFile.lastModified] : null }, { name: '', nameEn: '', slug: '', areaKeys: [], descriptionAr: '', descriptionEn: '', featured: false, status: 'active', parentCityId: '', coverFile: null });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSlugError('');
    if (!name || !slug) {
      setError('Name and slug are required');
      return;
    }
    // Both languages are mandatory: a city is a governorate and always has an English name
    // (the picker fills it). Requiring it here means nothing downstream ever falls back to
    // Arabic on the English UI.
    if (!nameEn.trim()) {
      setError('English name is required — pick the governorate above to fill it.');
      return;
    }
    setSaving(true);
    try {
      const created = await adminApi.post<{ id: string }>('/v1/admin/cities', {
        name, nameEn: nameEn || undefined, slug,
        areaKeys: areaKeys.length > 0 ? areaKeys : undefined,
        descriptionAr: descriptionAr || undefined, descriptionEn: descriptionEn || undefined,
        featured, status,
        parentCityId: parentCityId || undefined,
      });
      // Upload the cover chosen on this form now that the city exists (the image endpoint
      // needs the id). A failure here shouldn't lose the created city — fall through to its
      // edit screen to retry the photo.
      if (created?.id && coverFile) {
        const form = new FormData();
        form.append('file', coverFile);
        try {
          await adminApi.uploadWithProgress(`/v1/admin/cities/${created.id}/image`, form, () => {});
        } catch {
          /* keep the city; the edit screen shows the cover uploader to retry */
        }
      }
      formChanges.markSaved();
      if (created?.id) router.push(`/dashboard/cities/${created.id}`);
      else router.push('/dashboard/cities');
    } catch (e: any) {
      const err = e as AdminApiError;
      if (err.status === 409) {
        setSlugError('This slug is already in use. Please choose a different one.');
        setSlugTouched(true);
      } else {
        setError(err.message || 'Failed to create city');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground"><DashboardText>Dashboard</DashboardText></Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/cities" className="hover:text-foreground"><DashboardText>Cities</DashboardText></Link>
        <span className="mx-2">/</span>
        <span className="text-foreground"><DashboardText>New</DashboardText></span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>New City</DashboardText></h1>
        <Link href="/dashboard/cities">
          <Button variant="outline"><DashboardText>Cancel</DashboardText></Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle><DashboardText>City Details</DashboardText></CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            {/* Cover photo — visible and settable HERE, before saving. Buffered with a live
                preview and uploaded right after the city is created. */}
            <div className="space-y-2">
              <Label><DashboardText>Cover photo</DashboardText></Label>
              <div className="flex items-center gap-4">
                <div className="flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground">
                  {coverPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-xs">
                      <ImagePlus className="h-6 w-6" />
                      <DashboardText>Add photo</DashboardText>
                    </span>
                  )}
                </div>
                <div className="min-w-0 text-sm text-muted-foreground">
                  <p className="break-all">{coverFile ? coverFile.name : 'Recommended 1200×800 (3:2), min 800×600. Auto-optimized to WebP.'}</p>
                  {coverFile && (
                    <Button variant="ghost"
                      type="button"
                      onClick={() => pickCover(null)}
                      className="mt-1 text-xs font-medium text-destructive hover:underline"
                    >
                      <DashboardText>Remove</DashboardText>
                    </Button>
                  )}
                </div>
              </div>
              <FileUpload label={lang === 'ar' ? 'اختر صورة' : 'Choose a photo'} description={lang === 'ar' ? 'صورة للمدينة.' : 'A photo of the city.'}
                accept="image/*"
                onChange={(e) => pickCover(e.target.files?.[0] ?? null)}
                data-trace-id="create-city-cover-input"
              />
            </div>

            {/* A city IS one of Egypt's 27 governorates. Picking one fills both name
                fields, so the same governorate can't arrive spelled three different ways. */}
            <div className="space-y-2">
              <Label><DashboardText>Governorate *</DashboardText></Label>
              <CityPicker
                value={nameEn}
                onSelect={(c) => { setNameEn(c.value); setName(c.nameAr); setAreaKeys([]); }}
                traceId="create-city-governorate"
              />
            </div>

            {/* The regions (areas) this city offers. "Region" and "area" are the same thing
                — a district inside the governorate — so there is ONE control for it, not two.
                A place created in this city picks its region from exactly this set. */}
            <div className="space-y-2">
              <Label><DashboardText>Regions / areas in this city</DashboardText></Label>
              <CityAreasPicker governorate={nameEn || undefined} value={areaKeys} onChange={setAreaKeys} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name"><DashboardText>Name (Arabic) *</DashboardText></Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-trace-id="create-city-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn"><DashboardText>Name (English) *</DashboardText></Label>
                <Input
                  id="nameEn"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  data-trace-id="create-city-name-en"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slug"><DashboardText>Slug *</DashboardText></Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); setSlugError(''); }}
                  placeholder="city-slug"
                  data-trace-id="create-city-slug"
                  aria-invalid={!!slugError}
                  aria-describedby={slugError ? 'create-city-slug-error' : undefined}
                  required
                />
                {slugError && (
                  <p id="create-city-slug-error" className="text-sm text-destructive" data-trace-id="create-city-slug-error" role="alert">
                    {slugError}
                  </p>
                )}
              </div>
            </div>


            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="descriptionAr"><DashboardText>Description (Arabic)</DashboardText></Label>
                <Input
                  id="descriptionAr"
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  data-trace-id="create-city-desc-ar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn"><DashboardText>Description (English)</DashboardText></Label>
                <Input
                  id="descriptionEn"
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                  data-trace-id="create-city-desc-en"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="featured"
                  checked={featured}
                  onCheckedChange={(v) => setFeatured(v === true)}
                  data-trace-id="create-city-featured"
                />
                <Label htmlFor="featured"><DashboardText>Featured</DashboardText></Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status"><DashboardText>Status</DashboardText></Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger className="w-32" data-trace-id="create-city-status">
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
              <FormActionBar dirty={formChanges.dirty} saving={saving} error={error || slugError} disabled={saving} cancelHref="/dashboard/cities" traceId="create-city-save" />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
