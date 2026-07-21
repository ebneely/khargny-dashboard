'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { RegionPicker } from '@/components/region-picker';
import { findCity } from '@/lib/egypt-regions';
import { useDashboardLang } from '@/lib/dashboard-lang';
import type { AdminCity, AdminCategory } from '@/lib/api/types';

/**
 * Turn a place name into a URL slug: lowercase ASCII, hyphen-separated.
 * Arabic characters have no ASCII slug form, so an Arabic-only name yields an
 * empty base — the caller falls back to a random base then.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // drop non-ascii-alnum (incl. Arabic)
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

export default function NewPlacePage() {
  const router = useRouter();
  const { pick } = useDashboardLang();
  const [cities, setCities] = useState<AdminCity[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  // Auto-derive the slug from the name until the admin edits it by hand.
  const [slugEdited, setSlugEdited] = useState(false);

  // Keep the slug in lockstep with the (English, else Arabic) name while untouched.
  const autoSlugFrom = (nextName: string, nextNameEn: string) => {
    if (slugEdited) return;
    const base = slugify(nextNameEn) || slugify(nextName);
    setSlug(base);
  };
  const [cityId, setCityId] = useState('');
  const [region, setRegion] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState('active');
  // Cover photo is chosen up front but uploaded AFTER the place is created (media needs the
  // place id). Buffered here with a local preview so it's visible from the start.
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickCover = (file: File | null) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };

  useEffect(() => {
    Promise.all([
      adminApi.get<AdminCity[]>('/v1/admin/cities', { limit: 100 }),
      adminApi.get<AdminCategory[]>('/v1/admin/categories'),
    ]).then(([c, cats]) => {
      // /v1/admin/cities is paginated ({ data, meta }); /v1/admin/categories is a raw
      // array. Accept either shape (data → items → array) so the City dropdown isn't empty.
      setCities(Array.isArray(c) ? c : (c as any).data ?? (c as any).items ?? []);
      setCategories(Array.isArray(cats) ? cats : (cats as any).data ?? (cats as any).items ?? []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !cityId || !categoryId) {
      setError('Name, city, and category are required');
      return;
    }
    // Every place must sit in an area and be findable on the map — the area powers the
    // city's area filter (a place with none is invisible to it) and the maps link is the
    // only way a visitor gets directions.
    if (!region) {
      setError('Pick the area (region) this place is in.');
      return;
    }
    if (!mapsUrl.trim()) {
      setError('A Google Maps link is required so visitors can get directions.');
      return;
    }
    if (!coverFile) {
      setError('A cover photo is required — it is the card image visitors see first.');
      return;
    }
    // Guarantee a slug even if the field is blank (Arabic-only name → random base).
    let baseSlug = slug || slugify(nameEn) || slugify(name);
    if (!baseSlug) baseSlug = `place-${randomSuffix()}`;

    const create = (slugToUse: string) =>
      adminApi.post<{ id: string }>('/v1/admin/places', {
        name, nameEn: nameEn || undefined, slug: slugToUse,
        cityId, region: region || undefined, categoryId,
        description: description || undefined, descriptionEn: descriptionEn || undefined,
        address: address || undefined, phone: phone || undefined,
        website: website || undefined, mapsUrl: mapsUrl || undefined, instagram: instagram || undefined,
        facebook: facebook || undefined, tiktok: tiktok || undefined,
        priceRange: priceRange ? parseInt(priceRange) : undefined,
        featured, status,
      });

    setSaving(true);
    try {
      let created: { id: string };
      try {
        created = await create(baseSlug);
      } catch (err) {
        // If the slug is already taken, retry once with a short unique suffix so
        // the admin never has to hand-resolve a collision.
        const isDuplicate =
          err instanceof AdminApiError &&
          (err.status === 409 ||
            /slug/i.test(err.message) ||
            /exist|taken|duplicate|unique/i.test(err.message));
        if (isDuplicate) {
          const uniqueSlug = `${baseSlug}-${randomSuffix()}`;
          setSlug(uniqueSlug);
          created = await create(uniqueSlug);
        } else {
          throw err;
        }
      }

      // Upload the buffered cover now that the place exists. It's the first image, so it
      // becomes the card cover. A failure here shouldn't lose the created place — surface it
      // and send the admin to the edit screen to retry the photo.
      if (created?.id && coverFile) {
        const form = new FormData();
        form.append('file', coverFile);
        form.append('placeId', created.id);
        form.append('type', 'image');
        form.append('order', '0');
        try {
          await adminApi.uploadWithProgress('/v1/admin/media/image', form, () => {});
        } catch {
          router.push(`/dashboard/places/${created.id}`);
          return;
        }
      }
      router.push('/dashboard/places');
    } catch (e: any) {
      setError(e.message || 'Failed to create place');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">New Place</h1>
        <Link href="/dashboard/places">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Place Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Cover photo FIRST — it's the card image visitors see, and required. A visible
                placeholder from the start makes clear one is expected; the file is buffered
                and uploaded right after the place is created. */}
            <div className="space-y-2">
              <Label>Cover photo *</Label>
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
                  <p>{coverFile ? coverFile.name : 'Recommended 1200×800 (3:2). Auto-optimized to WebP.'}</p>
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
                data-trace-id="place-cover-input"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name (Arabic) *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); autoSlugFrom(e.target.value, nameEn); }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">Name (English)</Label>
                <Input
                  id="nameEn"
                  value={nameEn}
                  onChange={(e) => { setNameEn(e.target.value); autoSlugFrom(name, e.target.value); }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => { setSlugEdited(true); setSlug(slugify(e.target.value)); }}
                placeholder="auto-generated from the name"
              />
              <p className="text-xs text-muted-foreground">
                Auto-filled from the name and kept unique on save. Edit it if you want a custom URL.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cityId">City *</Label>
                {/* Options are labelled in the global view language (both names live on the
                    row; the value saved is the id, so both always reach the backend). */}
                <Select value={cityId} onValueChange={(v) => v && setCityId(v)}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{pick(c.name, c.nameEn)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{pick(c.nameAr, c.nameEn)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Area (region) — REQUIRED. Only appears AFTER a city is chosen: without a city
                there is no governorate to scope the areas to, so showing the full 55-area
                catalog first was meaningless. Scoped to the city's curated areas when it has
                them (area_keys), else to its governorate. The governorate is the city's
                English name, resolved from the catalog when the record has no nameEn. */}
            {cityId && (() => {
              const c = cities.find((x) => x.id === cityId);
              const governorate = c?.nameEn || (c ? findCity(c.name)?.value : undefined) || undefined;
              return (
                <div className="space-y-2">
                  <Label>Area *</Label>
                  <RegionPicker
                    value={region}
                    onChange={setRegion}
                    city={governorate}
                    allowedKeys={c?.areaKeys ?? undefined}
                    traceId="place-region"
                  />
                </div>
              );
            })()}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="description">Description (Arabic)</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">Description (English)</Label>
                <Input id="descriptionEn" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mapsUrl">Google Maps link</Label>
                <Input id="mapsUrl" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.app.goo.gl/…" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceRange">Price Range (1-4)</Label>
                <Select value={priceRange} onValueChange={(v) => v && setPriceRange(v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((n) => (
                      <SelectItem key={n} value={String(n)}>{'$'.repeat(n)} ({n})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiktok">TikTok</Label>
                <Input id="tiktok" value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="featured" checked={featured} onCheckedChange={(v) => setFeatured(v === true)} />
                <Label htmlFor="featured">Featured</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Place'}</Button>
              <Link href="/dashboard/places"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
