'use client';

import { useState, useEffect } from 'react';
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
import { RegionPicker } from '@/components/region-picker';
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
  const [region, setRegion] = useState('');
  const [areaKeys, setAreaKeys] = useState<string[]>([]);
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState('active');
  const [parentCityId, setParentCityId] = useState('');

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
        region: region || undefined,
        areaKeys: areaKeys.length > 0 ? areaKeys : undefined,
        descriptionAr: descriptionAr || undefined, descriptionEn: descriptionEn || undefined,
        featured, status,
        parentCityId: parentCityId || undefined,
      });
      // Straight to edit so the admin can add a cover photo (needs the new id).
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

            {/* Which areas this city offers. A place created in the city picks its area from
                exactly this set — leaving it empty means the place form falls back to the
                whole governorate. */}
            <div className="space-y-2">
              <Label>Areas in this city</Label>
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

            {/* Governorate, not free text — see components/region-picker.tsx. */}
            <div className="space-y-2">
              <Label htmlFor="region">Region (governorate)</Label>
              <RegionPicker
                value={region}
                onChange={setRegion}
                city={nameEn || undefined}
                traceId="create-city-region"
              />
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
