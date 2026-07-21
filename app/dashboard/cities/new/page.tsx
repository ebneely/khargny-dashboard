'use client';

import { useState, useEffect, useRef } from 'react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/cities" className="hover:text-foreground">Cities</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">New</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">New City</h1>
        <Link href="/dashboard/cities">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>City Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            {/* Cover photo — visible and settable HERE, before saving. Buffered with a live
                preview and uploaded right after the city is created. */}
            <div className="space-y-2">
              <Label>Cover photo</Label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  data-ro-allow="true"
                  className="relative flex h-28 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-[var(--brand-600)] hover:text-foreground"
                  aria-label={coverPreview ? 'Change cover photo' : 'Add cover photo'}
                >
                  {coverPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex flex-col items-center gap-1 text-xs">
                      <ImagePlus className="h-6 w-6" />
                      Add photo
                    </span>
                  )}
                </button>
                <div className="min-w-0 text-sm text-muted-foreground">
                  <p>{coverFile ? coverFile.name : 'Recommended 1200×800 (3:2), min 800×600. Auto-optimized to WebP.'}</p>
                  {coverFile && (
                    <button
                      type="button"
                      onClick={() => pickCover(null)}
                      className="mt-1 text-xs font-medium text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickCover(e.target.files?.[0] ?? null)}
                data-trace-id="create-city-cover-input"
              />
            </div>

            {/* A city IS one of Egypt's 27 governorates. Picking one fills both name
                fields, so the same governorate can't arrive spelled three different ways. */}
            <div className="space-y-2">
              <Label>Governorate *</Label>
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
              <Label>Regions / areas in this city</Label>
              <CityAreasPicker governorate={nameEn || undefined} value={areaKeys} onChange={setAreaKeys} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name (Arabic) *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-trace-id="create-city-name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">Name (English) *</Label>
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
                <Label htmlFor="slug">Slug *</Label>
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
                <Label htmlFor="descriptionAr">Description (Arabic)</Label>
                <Input
                  id="descriptionAr"
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  data-trace-id="create-city-desc-ar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">Description (English)</Label>
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
                <Label htmlFor="featured">Featured</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger className="w-32" data-trace-id="create-city-status">
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
              <Button type="submit" disabled={saving} data-trace-id="create-city-save">
                {saving ? 'Saving…' : 'Create City'}
              </Button>
              <Link href="/dashboard/cities">
                <Button type="button" variant="outline" data-trace-id="create-city-cancel">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
