'use client';

import { optionalText } from '@/lib/api/subscribers';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { UrlTabs } from '@/components/ui/url-tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { RegionPicker } from '@/components/region-picker';
import { findCity } from '@/lib/egypt-regions';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { PRICE_BANDS } from '@/lib/price-bands';
import { subscriberPlaceReturn, subscriberReturnPath } from '@/lib/subscriber-place-return';
import { subscriberValidation } from '@/components/admin/subscriber-ui';
import { useAdminAmenities } from '@/lib/api/hooks/use-admin-amenities';
import { useAdminTags } from '@/lib/api/hooks/use-admin-tags';
import { HoursEditor } from '@/components/admin/hours-editor';
import type { PlaceHour } from '@/lib/api/hooks/use-place-hours';
import type { AdminCity, AdminCategory, AdminOptions } from '@/lib/api/types';

/**
 * Turn a place name into a URL slug: lowercase ASCII, hyphen-separated. Arabic characters
 * have no ASCII slug form, so an Arabic-only name yields an empty base — the caller falls
 * back to a random base then.
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

/** A blank week — 7 closed days — the starting point until the admin sets hours. */
function blankWeek(): PlaceHour[] {
  return Array.from({ length: 7 }, (_, d) => ({
    dayOfWeek: d,
    openTime: null,
    closeTime: null,
    isClosed: true,
  }));
}

export default function NewPlacePage() {
  const router = useRouter();
  const { pick, lang } = useDashboardLang();
  const [cities, setCities] = useState<AdminCity[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [fallbackSlug] = useState(() => `place-${randomSuffix()}`);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fieldError = (field: string) => fieldErrors[field] ? <p id={`${field}-error`} className="text-sm text-destructive" role="alert">{fieldErrors[field]}</p> : null;

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const autoSlugFrom = (nextName: string, nextNameEn: string) => {
    if (slugEdited) return;
    setSlug(slugify(nextNameEn) || slugify(nextName));
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

  // Cover + gallery are buffered here and uploaded AFTER the place is created (media needs
  // the place id). Cover is the first image (order 0) and required.
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [gallery, setGallery] = useState<{ file: File; preview: string }[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Amenities / tags / hours are buffered too, then attached to the new place after create.
  const { data: allAmenities } = useAdminAmenities();
  const { data: allTags } = useAdminTags();
  const [amenityIds, setAmenityIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [hours, setHours] = useState<PlaceHour[]>(blankWeek);
  const [hoursTouched, setHoursTouched] = useState(false);

  const setDay = (day: number, patch: Partial<PlaceHour>) => {
    setHoursTouched(true);
    setHours((h) => h.map((x) => (x.dayOfWeek === day ? { ...x, ...patch } : x)));
  };
  const setDays = (days: number[], patch: Partial<PlaceHour>) => {
    setHoursTouched(true);
    setHours((h) => h.map((x) => (days.includes(x.dayOfWeek) ? { ...x, ...patch } : x)));
  };

  const pickCover = (file: File | null) => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  };
  const addGallery = (files: FileList | null) => {
    if (!files) return;
    setGallery((g) => [...g, ...Array.from(files).map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  };
  const removeGallery = (i: number) => {
    setGallery((g) => {
      URL.revokeObjectURL(g[i].preview);
      return g.filter((_, idx) => idx !== i);
    });
  };

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  useEffect(() => {
    Promise.all([
      adminApi.get<AdminOptions<AdminCity>>('/v1/admin/cities', { limit: 100 }),
      adminApi.get<AdminOptions<AdminCategory>>('/v1/admin/categories'),
    ]).then(([c, cats]) => {
      setCities(Array.isArray(c) ? c : c.data ?? c.items ?? []);
      setCategories(Array.isArray(cats) ? cats : cats.data ?? cats.items ?? []);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    setError('');
    setFieldErrors({});
    if (!name || !cityId || !categoryId) {
      setError('Name, city, and category are required (Details tab).');
      return;
    }
    if (!region) {
      setError('Pick the area (region) this place is in (Details tab).');
      return;
    }
    if (!mapsUrl.trim()) {
      setError('A Google Maps link is required so visitors can get directions (Details tab).');
      return;
    }
    if (!coverFile) {
      setError('A cover photo is required — it is the card image visitors see first (Details tab).');
      return;
    }
    const baseSlug = slug || slugify(nameEn) || slugify(name) || fallbackSlug;

    const create = (slugToUse: string) =>
      adminApi.post<{ id: string }>('/v1/admin/places', {
        name, nameEn: optionalText(nameEn), slug: slugToUse,
        cityId, region: optionalText(region), categoryId,
        description: optionalText(description), descriptionEn: optionalText(descriptionEn),
        address: optionalText(address), phone: optionalText(phone),
        website: optionalText(website), mapsUrl: optionalText(mapsUrl), instagram: optionalText(instagram),
        facebook: optionalText(facebook), tiktok: optionalText(tiktok),
        priceRange: priceRange ? parseInt(priceRange) : undefined,
        featured, status,
      }, { headers: { 'Idempotency-Key': idempotencyKey } });

    const uploadImage = async (file: File, order: number, placeId: string) => {
      const form = new FormData();
      form.append('file', file);
      form.append('placeId', placeId);
      form.append('type', 'image');
      form.append('order', String(order));
      await adminApi.uploadWithProgress('/v1/admin/media/image', form, () => {});
    };

    setSaving(true);
    savingRef.current = true;
    try {
      const created = await create(baseSlug);

      const id = created?.id;
      if (!id) {
        router.push('/dashboard/places');
        return;
      }

      // Attach everything the admin set. Any single failure sends them to the edit screen —
      // the place already exists, so they finish there rather than losing the whole form.
      try {
        await uploadImage(coverFile, 0, id);
        for (let i = 0; i < gallery.length; i++) await uploadImage(gallery[i].file, i + 1, id);
        if (amenityIds.length) await adminApi.post(`/v1/admin/amenities/place/${id}/assign`, { amenityIds });
        if (tagIds.length) await adminApi.post(`/v1/admin/tags/place/${id}/assign`, { tagIds });
        if (hoursTouched) await adminApi.put(`/v1/admin/places/${id}/hours`, { hours });
      } catch {
        router.push(subscriberPlaceReturn(id, true) ?? `/dashboard/places/${id}`);
        return;
      }
      router.push(subscriberPlaceReturn(id) ?? '/dashboard/places');
    } catch (caught) {
      const slugConflict = caught instanceof AdminApiError && caught.status === 409 &&
        (['SLUG_ALREADY_EXISTS', 'SLUG_TAKEN', 'SLUG_CONFLICT', 'DUPLICATE_SLUG'].includes(caught.code) || (/slug/i.test(caught.message) && /exist|taken|duplicate|unique|conflict/i.test(caught.message)));
      if (slugConflict) {
        const message = lang === 'ar' ? 'هذا الرابط مستخدم بالفعل. اختر رابطاً آخر ثم احفظ مجدداً.' : 'This slug is already in use. Choose another slug and save again.';
        setFieldErrors({ slug: message }); setError(message);
      } else {
        const validation = subscriberValidation(caught, ['name', 'nameEn', 'slug', 'cityId', 'categoryId', 'region', 'description', 'descriptionEn', 'address', 'phone', 'website', 'mapsUrl', 'instagram', 'facebook', 'tiktok', 'priceRange', 'featured', 'status'], lang);
        setFieldErrors(validation.fields); setError(validation.message);
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const checkbox = (checked: boolean) => (
    <span
      aria-hidden="true"
      className={
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ' +
        (checked ? 'border-[var(--brand-600)] bg-[var(--brand-600)] text-white' : 'border-input bg-card')
      }
    >
      {checked && (
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M3 8.5L6.5 12L13 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-foreground">New Place</h1>
        <Button variant="outline" onClick={() => router.push(subscriberReturnPath() ?? '/dashboard/places')}>Cancel</Button>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <p className="mb-4 text-sm text-destructive" role="alert">{error}</p>}

        {/* Same tabs as the edit screen, so a place can be built completely in one pass:
            details + cover, amenities, tags, hours and extra photos are all set here and
            attached to the place the moment it's created. */}
        <UrlTabs values={["details", "amenities", "tags", "hours", "photos"]}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="details">{lang === 'ar' ? 'البيانات' : 'Details'}</TabsTrigger>
            <TabsTrigger value="amenities">{lang === 'ar' ? 'المرافق' : 'Amenities'}</TabsTrigger>
            <TabsTrigger value="tags">{lang === 'ar' ? 'الوسوم' : 'Tags'}</TabsTrigger>
            <TabsTrigger value="hours">{lang === 'ar' ? 'المواعيد' : 'Hours'}</TabsTrigger>
            <TabsTrigger value="photos">{lang === 'ar' ? 'الوسائط' : 'Media'}</TabsTrigger>
          </TabsList>

          <TabsContent keepMounted value="details">
            <Card>
              <CardHeader><CardTitle>Place Details</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {/* Cover photo — required, visible from the start, uploaded after create. */}
                <div className="space-y-2">
                  <Label>Cover photo *</Label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => coverInputRef.current?.click()}
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
                        <button type="button" onClick={() => pickCover(null)} className="mt-1 text-xs font-medium text-destructive hover:underline">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickCover(e.target.files?.[0] ?? null)} data-trace-id="place-cover-input" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (Arabic) *</Label>
                    <Input id="name" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'name-error' : undefined} value={name} onChange={(e) => { setName(e.target.value); autoSlugFrom(e.target.value, nameEn); }} />{fieldError('name')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameEn">Name (English)</Label>
                    <Input id="nameEn" aria-invalid={Boolean(fieldErrors.nameEn)} aria-describedby={fieldErrors.nameEn ? 'nameEn-error' : undefined} value={nameEn} onChange={(e) => { setNameEn(e.target.value); autoSlugFrom(name, e.target.value); }} />{fieldError('nameEn')}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input id="slug" aria-invalid={Boolean(fieldErrors.slug)} aria-describedby={fieldErrors.slug ? 'slug-error' : undefined} value={slug} onChange={(e) => { setSlugEdited(true); setSlug(slugify(e.target.value)); }} placeholder="auto-generated from the name" />{fieldError('slug')}
                  <p className="text-xs text-muted-foreground">Auto-filled from the name and kept unique on save. Edit it if you want a custom URL.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cityId">City *</Label>
                    <Select value={cityId} onValueChange={(v) => v && setCityId(v)}>
                      <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                      <SelectContent>
                        {cities.map((c) => (<SelectItem key={c.id} value={c.id}>{pick(c.name, c.nameEn)}</SelectItem>))}
                      </SelectContent>
                    </Select>{fieldError('cityId')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category *</Label>
                    <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{pick(c.nameAr, c.nameEn)}</SelectItem>))}
                      </SelectContent>
                    </Select>{fieldError('categoryId')}
                  </div>
                </div>

                {cityId && (() => {
                  const c = cities.find((x) => x.id === cityId);
                  const governorate = c?.nameEn || (c ? findCity(c.name)?.value : undefined) || undefined;
                  return (
                    <div className="space-y-2">
                      <Label>Area *</Label>
                      <RegionPicker value={region} onChange={setRegion} city={governorate} allowedKeys={c?.areaKeys ?? undefined} traceId="place-region" />{fieldError('region')}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Arabic)</Label>
                    <Input id="description" aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? 'description-error' : undefined} value={description} onChange={(e) => setDescription(e.target.value)} />{fieldError('description')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="descriptionEn">Description (English)</Label>
                    <Input id="descriptionEn" aria-invalid={Boolean(fieldErrors.descriptionEn)} aria-describedby={fieldErrors.descriptionEn ? 'descriptionEn-error' : undefined} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />{fieldError('descriptionEn')}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" aria-invalid={Boolean(fieldErrors.address)} aria-describedby={fieldErrors.address ? 'address-error' : undefined} value={address} onChange={(e) => setAddress(e.target.value)} />{fieldError('address')}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'phone-error' : undefined} value={phone} onChange={(e) => setPhone(e.target.value)} />{fieldError('phone')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" aria-invalid={Boolean(fieldErrors.website)} aria-describedby={fieldErrors.website ? 'website-error' : undefined} value={website} onChange={(e) => setWebsite(e.target.value)} />{fieldError('website')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mapsUrl">Google Maps link *</Label>
                    <Input id="mapsUrl" aria-invalid={Boolean(fieldErrors.mapsUrl)} aria-describedby={fieldErrors.mapsUrl ? 'mapsUrl-error' : undefined} value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.app.goo.gl/…" />{fieldError('mapsUrl')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceRange">{lang === 'ar' ? 'فئة السعر للفرد (جنيه)' : 'Price band per person (EGP)'}</Label>
                    <Select value={priceRange} onValueChange={(v) => v && setPriceRange(v)}>
                      <SelectTrigger id="priceRange" className="w-full bg-background text-foreground"><SelectValue placeholder={lang === 'ar' ? 'اختر الفئة' : 'Select band'} /></SelectTrigger>
                      <SelectContent>
                        {PRICE_BANDS.map((band) => (<SelectItem key={band.level} value={String(band.level)}>{lang === 'ar' ? band.labelAr : band.labelEn}</SelectItem>))}
                      </SelectContent>
                    </Select>{fieldError('priceRange')}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input id="instagram" aria-invalid={Boolean(fieldErrors.instagram)} aria-describedby={fieldErrors.instagram ? 'instagram-error' : undefined} value={instagram} onChange={(e) => setInstagram(e.target.value)} />{fieldError('instagram')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="facebook">Facebook</Label>
                    <Input id="facebook" aria-invalid={Boolean(fieldErrors.facebook)} aria-describedby={fieldErrors.facebook ? 'facebook-error' : undefined} value={facebook} onChange={(e) => setFacebook(e.target.value)} />{fieldError('facebook')}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tiktok">TikTok</Label>
                    <Input id="tiktok" aria-invalid={Boolean(fieldErrors.tiktok)} aria-describedby={fieldErrors.tiktok ? 'tiktok-error' : undefined} value={tiktok} onChange={(e) => setTiktok(e.target.value)} />{fieldError('tiktok')}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox id="featured" aria-invalid={Boolean(fieldErrors.featured)} aria-describedby={fieldErrors.featured ? 'featured-error' : undefined} checked={featured} onCheckedChange={(v) => setFeatured(v === true)} />{fieldError('featured')}
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
                    </Select>{fieldError('status')}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent keepMounted value="amenities">
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
                <CardDescription>Pick which amenities this place has. Only amenities created in the catalog appear.</CardDescription>
              </CardHeader>
              <CardContent>
                {!allAmenities || allAmenities.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                    <p className="mb-2">No amenities exist in the catalog yet.</p>
                    <Link href="/dashboard/amenities/new" className="text-[var(--brand-600)] underline-offset-4 hover:underline">Create amenities →</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2" role="group" aria-label="Amenities">
                    {allAmenities.map((a) => {
                      const checked = amenityIds.includes(a.id);
                      return (
                        <button key={a.id} type="button" role="checkbox" aria-checked={checked}
                          onClick={() => setAmenityIds((l) => toggle(l, a.id))}
                          className={'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ' + (checked ? 'border-[var(--brand-600)] bg-[var(--brand-50)]' : 'border-border bg-card hover:bg-muted')}>
                          {checkbox(checked)}
                          <span className="truncate">{a.name}</span>
                          {a.nameEn && <span className="ml-auto truncate text-xs text-muted-foreground">{a.nameEn}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent keepMounted value="tags">
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>Tag this place (family-friendly, outdoor…). Only tags created in the catalog appear.</CardDescription>
              </CardHeader>
              <CardContent>
                {!allTags || allTags.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                    <p className="mb-2">No tags exist in the catalog yet.</p>
                    <Link href="/dashboard/tags/new" className="text-[var(--brand-600)] underline-offset-4 hover:underline">Create tags →</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2" role="group" aria-label="Tags">
                    {allTags.map((tg) => {
                      const checked = tagIds.includes(tg.id);
                      return (
                        <button key={tg.id} type="button" role="checkbox" aria-checked={checked}
                          onClick={() => setTagIds((l) => toggle(l, tg.id))}
                          className={'flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ' + (checked ? 'border-[var(--brand-600)] bg-[var(--brand-50)]' : 'border-border bg-card hover:bg-muted')}>
                          {checkbox(checked)}
                          <span className="truncate">{tg.name}</span>
                          {tg.nameEn && <span className="ml-auto truncate text-xs text-muted-foreground">{tg.nameEn}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent keepMounted value="hours">
            <Card>
              <CardHeader>
                <CardTitle>Opening hours</CardTitle>
                <CardDescription>Set the week now, or leave it and add hours later on the place.</CardDescription>
              </CardHeader>
              <CardContent>
                <HoursEditor hours={hours} setDay={setDay} setDays={setDays} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent keepMounted value="photos">
            <Card>
              <CardHeader>
                <CardTitle>Media</CardTitle>
                <CardDescription>The cover is on the Details tab. Add more gallery photos here — they upload with the place.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()} className="gap-2">
                  <ImagePlus className="h-4 w-4" /> Add photos
                </Button>
                <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addGallery(e.target.files); e.target.value = ''; }} />
                {gallery.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {gallery.map((g, i) => (
                      <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-md border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g.preview} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => removeGallery(i)} aria-label="Remove photo"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </UrlTabs>

        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create Place'}</Button>
          <Button type="button" variant="outline" onClick={() => router.push(subscriberReturnPath() ?? '/dashboard/places')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
