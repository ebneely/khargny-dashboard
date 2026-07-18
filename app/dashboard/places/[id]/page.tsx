'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { X, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import { useAdminPlace } from '@/lib/api/hooks/use-admin-places';
import { useAdminAmenities } from '@/lib/api/hooks/use-admin-amenities';
import { usePlaceAmenities } from '@/lib/api/hooks/use-place-amenities';
import { useAdminTags } from '@/lib/api/hooks/use-admin-tags';
import { usePlaceTags } from '@/lib/api/hooks/use-place-tags';
import { usePlaceHours, DAY_LABELS } from '@/lib/api/hooks/use-place-hours';
import { usePlaceMedia } from '@/lib/api/hooks/use-place-media';
import type { AdminCity, AdminCategory } from '@/lib/api/types';

export default function EditPlacePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: place, isLoading: loadingPlace, isError: loadError } = useAdminPlace(id);
  const { data: allAmenities, isLoading: loadingAmenities, isError: loadAmenitiesError } = useAdminAmenities();
  const amenities = usePlaceAmenities(id, []);
  const { data: allTags, isLoading: loadingTags, isError: loadTagsError } = useAdminTags();
  const tags = usePlaceTags(id, []);
  const hours = usePlaceHours(id);
  const [hoursError, setHoursError] = useState('');
  const media = usePlaceMedia(id);
  const [mediaError, setMediaError] = useState('');
  const [cities, setCities] = useState<AdminCity[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState('');
  const [amenitiesError, setAmenitiesError] = useState('');
  const [tagsError, setTagsError] = useState('');
  const [saving, setSaving] = useState(false);

  const isSoftDeleted = Boolean(place?.deletedAt);

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [cityId, setCityId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState('draft');

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

  useEffect(() => {
    if (place) {
      setName(place.name);
      setNameEn(place.nameEn || '');
      setSlug(place.slug);
      setCityId(place.cityId);
      setCategoryId(place.categoryId);
      setDescription(place.description || '');
      setDescriptionEn(place.descriptionEn || '');
      setAddress(place.address || '');
      setPhone(place.phone || '');
      setWebsite(place.website || '');
      setInstagram(place.instagram || '');
      setFacebook(place.facebook || '');
      setTiktok(place.tiktok || '');
      setPriceRange(place.priceRange ? String(place.priceRange) : '');
      setFeatured(place.featured);
      setStatus(place.status);
    }
  }, [place]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAmenitiesError('');
    setSaving(true);
    try {
      await adminApi.patch(`/v1/admin/places/${id}`, {
        name, nameEn: nameEn || undefined, slug,
        cityId, categoryId,
        description: description || undefined, descriptionEn: descriptionEn || undefined,
        address: address || undefined, phone: phone || undefined,
        website: website || undefined, instagram: instagram || undefined,
        facebook: facebook || undefined, tiktok: tiktok || undefined,
        priceRange: priceRange ? parseInt(priceRange) : undefined,
        featured, status,
      });
      if (amenities.isDirty && !isSoftDeleted) {
        try {
          await amenities.save();
        } catch (amenityErr) {
          if (amenityErr instanceof AdminApiError) {
            setAmenitiesError(amenityErr.message);
          } else {
            setAmenitiesError('Connection error. Try again.');
          }
          setSaving(false);
          return;
        }
      }
      if (tags.isDirty && !isSoftDeleted) {
        try {
          await tags.save();
        } catch (tagErr) {
          if (tagErr instanceof AdminApiError) {
            setTagsError(tagErr.message);
          } else {
            setTagsError('Connection error. Try again.');
          }
          setSaving(false);
          return;
        }
      }
      if (hours.isDirty && !isSoftDeleted) {
        try {
          await hours.save();
        } catch (hoursErr) {
          if (hoursErr instanceof AdminApiError) {
            setHoursError(hoursErr.message);
          } else {
            setHoursError('Connection error. Try again.');
          }
          setSaving(false);
          return;
        }
      }
      router.push('/dashboard/places');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update place';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleAmenitiesSave = async () => {
    setAmenitiesError('');
    try {
      await amenities.save();
    } catch (e) {
      if (e instanceof AdminApiError) {
        setAmenitiesError(e.message);
      } else {
        setAmenitiesError('Connection error. Try again.');
      }
    }
  };

  const handleTagsSave = async () => {
    setTagsError('');
    try {
      await tags.save();
    } catch (e) {
      if (e instanceof AdminApiError) {
        setTagsError(e.message);
      } else {
        setTagsError('Connection error. Try again.');
      }
    }
  };

  const handleHoursSave = async () => {
    setHoursError('');
    try {
      await hours.save();
    } catch (e) {
      if (e instanceof AdminApiError) {
        setHoursError(e.message);
      } else {
        setHoursError('Connection error. Try again.');
      }
    }
  };

  if (loadingPlace) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>;
  if (loadError) return <div className="text-center py-8"><p className="text-muted-foreground mb-3">Failed to load place</p><Button variant="outline" onClick={() => window.location.reload()}>Retry</Button></div>;
  if (!place) return <div className="text-center py-8"><p className="text-muted-foreground">Place not found</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Edit Place</h1>
        <Link href="/dashboard/places">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Place Details</CardTitle></CardHeader>
        <CardContent>
          <form id="place-form" onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name (Arabic) *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">Name (English)</Label>
                <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug *</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cityId">City *</Label>
                <Select value={cityId} onValueChange={(v) => v && setCityId(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
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

            <div className="grid grid-cols-3 gap-4">
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
          </form>
        </CardContent>
      </Card>

      <Card data-trace-id="place-amenities-section" className="mt-6">
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
          <CardDescription>
            Pick which amenities this place has. Changes are sent to the public detail on save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSoftDeleted && (
            <div
              data-trace-id="place-amenities-soft-deleted"
              role="status"
              className="mb-4 flex items-start gap-2 rounded-(--radius-ds-md) border border-[var(--error)]/30 bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Place is soft-deleted. Amenities are read-only.</span>
            </div>
          )}

          {amenitiesError && (
            <div
              data-trace-id="place-amenities-error"
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-(--radius-ds-md) border border-[var(--error)]/30 bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{amenitiesError}</span>
            </div>
          )}

          {loadingAmenities ? (
            <div className="space-y-2" data-trace-id="place-amenities-picker">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 bg-muted animate-pulse rounded-(--radius-ds-md)" />
              ))}
            </div>
          ) : loadAmenitiesError ? (
            <p data-trace-id="place-amenities-error" className="text-sm text-[var(--error)]">
              Failed to load amenities catalog.
            </p>
          ) : !allAmenities || allAmenities.length === 0 ? (
            <div
              data-trace-id="place-amenities-empty"
              className="rounded-(--radius-ds-md) border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground"
            >
              <p className="mb-2">No amenities exist in the catalog yet.</p>
              <Link href="/dashboard/amenities/new" className="text-[var(--brand-600)] underline-offset-4 hover:underline">
                Create amenities in catalog →
              </Link>
            </div>
          ) : (
            <>
              <div
                data-trace-id="place-amenities-picker"
                className="grid grid-cols-1 gap-2 md:grid-cols-2"
                role="group"
                aria-label="Amenities"
              >
                {allAmenities.map((a) => {
                  const checked = amenities.amenityIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      data-trace-id={`place-amenities-chip-${a.id}`}
                      disabled={isSoftDeleted}
                      onClick={() => amenities.toggleAmenity(a.id)}
                      className={
                        'flex items-center gap-2 rounded-(--radius-ds-md) border px-3 py-2 text-sm transition-colors text-left disabled:cursor-not-allowed disabled:opacity-60 ' +
                        (checked
                          ? 'border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--text-primary)]'
                          : 'border-border bg-card text-[var(--text-primary)] hover:bg-muted')
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ' +
                          (checked
                            ? 'border-[var(--brand-600)] bg-[var(--brand-600)] text-[var(--white)]'
                            : 'border-input bg-card')
                        }
                      >
                        {checked && (
                          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 8.5L6.5 12L13 4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="truncate">{a.name}</span>
                      {a.nameEn && (
                        <span className="ml-auto truncate text-xs text-muted-foreground">{a.nameEn}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {amenities.amenityIds.length === 0 && (
                <p
                  data-trace-id="place-amenities-empty"
                  className="mt-3 text-sm text-muted-foreground"
                >
                  No amenities assigned yet — pick from the catalog.
                </p>
              )}

              <div className="mt-4 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  size="sm"
                  data-trace-id="place-amenities-save"
                  disabled={!amenities.isDirty || amenities.isSaving || isSoftDeleted}
                  onClick={handleAmenitiesSave}
                >
                  {amenities.isSaving ? 'Saving…' : 'Save amenities'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card data-trace-id="place-tags-section" className="mt-6">
        <CardHeader>
          <CardTitle>Tags</CardTitle>
          <CardDescription>
            Tag this place (family-friendly, outdoor…) so visitors can filter by vibe. Changes are sent to the public detail on save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSoftDeleted && (
            <div
              data-trace-id="place-tags-soft-deleted"
              role="status"
              className="mb-4 flex items-start gap-2 rounded-(--radius-ds-md) border border-[var(--error)]/30 bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Place is soft-deleted. Tags are read-only.</span>
            </div>
          )}

          {tagsError && (
            <div
              data-trace-id="place-tags-error"
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-(--radius-ds-md) border border-[var(--error)]/30 bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{tagsError}</span>
            </div>
          )}

          {loadingTags ? (
            <div className="space-y-2" data-trace-id="place-tags-picker">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 bg-muted animate-pulse rounded-(--radius-ds-md)" />
              ))}
            </div>
          ) : loadTagsError ? (
            <p data-trace-id="place-tags-error" className="text-sm text-[var(--error)]">
              Failed to load tags catalog.
            </p>
          ) : !allTags || allTags.length === 0 ? (
            <div
              data-trace-id="place-tags-empty"
              className="rounded-(--radius-ds-md) border border-dashed border-border bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground"
            >
              <p className="mb-2">No tags exist in the catalog yet.</p>
              <Link href="/dashboard/tags/new" className="text-[var(--brand-600)] underline-offset-4 hover:underline">
                Create tags in catalog →
              </Link>
            </div>
          ) : (
            <>
              <div
                data-trace-id="place-tags-picker"
                className="grid grid-cols-1 gap-2 md:grid-cols-2"
                role="group"
                aria-label="Tags"
              >
                {allTags.map((t) => {
                  const checked = tags.tagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      data-trace-id={`place-tags-chip-${t.id}`}
                      disabled={isSoftDeleted}
                      onClick={() => tags.toggleTag(t.id)}
                      className={
                        'flex items-center gap-2 rounded-(--radius-ds-md) border px-3 py-2 text-sm transition-colors text-left disabled:cursor-not-allowed disabled:opacity-60 ' +
                        (checked
                          ? 'border-[var(--brand-600)] bg-[var(--brand-50)] text-[var(--text-primary)]'
                          : 'border-border bg-card text-[var(--text-primary)] hover:bg-muted')
                      }
                    >
                      <span
                        aria-hidden="true"
                        className={
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ' +
                          (checked
                            ? 'border-[var(--brand-600)] bg-[var(--brand-600)] text-[var(--white)]'
                            : 'border-input bg-card')
                        }
                      >
                        {checked && (
                          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M3 8.5L6.5 12L13 4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="truncate">{t.name}</span>
                      {t.nameEn && (
                        <span className="ml-auto truncate text-xs text-muted-foreground">{t.nameEn}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {tags.tagIds.length === 0 && (
                <p
                  data-trace-id="place-tags-empty"
                  className="mt-3 text-sm text-muted-foreground"
                >
                  No tags assigned yet — pick from the catalog.
                </p>
              )}

              <div className="mt-4 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  size="sm"
                  data-trace-id="place-tags-save"
                  disabled={!tags.isDirty || tags.isSaving || isSoftDeleted}
                  onClick={handleTagsSave}
                >
                  {tags.isSaving ? 'Saving…' : 'Save tags'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card data-trace-id="place-hours-section" className="mt-6">
        <CardHeader>
          <CardTitle>Opening hours</CardTitle>
          <CardDescription>
            Set when this place is open each day. Mark a day closed to hide its hours on the public detail. Saved with the place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSoftDeleted && (
            <div
              data-trace-id="place-hours-soft-deleted"
              role="status"
              className="mb-4 flex items-start gap-2 rounded-(--radius-ds-md) border border-[var(--error)]/30 bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Place is soft-deleted. Hours are read-only.</span>
            </div>
          )}
          {hoursError && (
            <div
              data-trace-id="place-hours-error"
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-(--radius-ds-md) border border-[var(--error)]/30 bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{hoursError}</span>
            </div>
          )}
          {hours.loading ? (
            <div className="space-y-2" data-trace-id="place-hours-grid">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded-(--radius-ds-md)" />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-2" data-trace-id="place-hours-grid">
                {hours.hours.map((h) => (
                  <div
                    key={h.dayOfWeek}
                    className="flex flex-wrap items-center gap-3 rounded-(--radius-ds-md) border border-border px-3 py-2"
                    data-trace-id={`place-hours-day-${h.dayOfWeek}`}
                  >
                    <span className="w-24 text-sm font-medium">{DAY_LABELS[h.dayOfWeek]}</span>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={h.isClosed}
                        disabled={isSoftDeleted}
                        onChange={(e) => hours.setDay(h.dayOfWeek, { isClosed: e.target.checked })}
                        data-trace-id={`place-hours-closed-${h.dayOfWeek}`}
                      />
                      Closed
                    </label>
                    <Input
                      type="time"
                      aria-label={`${DAY_LABELS[h.dayOfWeek]} open time`}
                      className="w-32"
                      value={h.openTime ?? ''}
                      disabled={isSoftDeleted || h.isClosed}
                      onChange={(e) => hours.setDay(h.dayOfWeek, { openTime: e.target.value || null })}
                      data-trace-id={`place-hours-open-${h.dayOfWeek}`}
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      aria-label={`${DAY_LABELS[h.dayOfWeek]} close time`}
                      className="w-32"
                      value={h.closeTime ?? ''}
                      disabled={isSoftDeleted || h.isClosed}
                      onChange={(e) => hours.setDay(h.dayOfWeek, { closeTime: e.target.value || null })}
                      data-trace-id={`place-hours-close-${h.dayOfWeek}`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  size="sm"
                  data-trace-id="place-hours-save"
                  disabled={!hours.isDirty || hours.isSaving || isSoftDeleted}
                  onClick={handleHoursSave}
                >
                  {hours.isSaving ? 'Saving…' : 'Save hours'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card data-trace-id="place-media-section" className="mt-6">
        <CardHeader>
          <CardTitle>Photos</CardTitle>
          <CardDescription>
            Upload images for this place. They appear in its public gallery. Use the arrows to reorder; the first image is the cover.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSoftDeleted && (
            <div
              data-trace-id="place-media-soft-deleted"
              role="status"
              className="mb-4 flex items-start gap-2 rounded-(--radius-ds-md) border border-[var(--error)]/30 bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Place is soft-deleted. Photos are read-only.</span>
            </div>
          )}
          {(mediaError || media.isError) && (
            <div
              data-trace-id="place-media-error"
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-(--radius-ds-md) border border-[var(--error)]/30 bg-[var(--error-bg)] px-3 py-2 text-sm text-[var(--error)]"
            >
              <X className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{mediaError || 'Failed to load photos.'}</span>
            </div>
          )}

          {!isSoftDeleted && (
            <div className="mb-4">
              <label
                className="inline-flex cursor-pointer items-center gap-2 rounded-(--radius-ds-md) border border-dashed border-border bg-muted/40 px-4 py-2 text-sm hover:bg-muted"
                data-trace-id="place-media-upload"
              >
                <Plus className="h-4 w-4" />
                {media.busy ? 'Uploading…' : 'Add photo'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={media.busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setMediaError('');
                    try {
                      await media.upload(file);
                    } catch (err) {
                      setMediaError(err instanceof AdminApiError ? err.message : 'Upload failed. Try again.');
                    }
                  }}
                />
              </label>
            </div>
          )}

          {media.loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-trace-id="place-media-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-(--radius-ds-md)" />
              ))}
            </div>
          ) : media.images.length === 0 ? (
            <p data-trace-id="place-media-empty" className="text-sm text-muted-foreground">
              No photos yet — add the first one above.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-trace-id="place-media-grid">
              {media.images.map((img, idx) => (
                <div
                  key={img.id}
                  className="group relative overflow-hidden rounded-(--radius-ds-md) border border-border"
                  data-trace-id={`place-media-item-${img.id}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.urls?.thumb || img.urls?.small || img.url}
                    alt={img.altText || 'Place photo'}
                    className="aspect-square w-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-[var(--brand-600)] px-1.5 py-0.5 text-[10px] text-[var(--white)]">
                      Cover
                    </span>
                  )}
                  {!isSoftDeleted && (
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex gap-1">
                        <Button
                          type="button" variant="ghost" size="icon-sm"
                          aria-label="Move left" disabled={idx === 0 || media.busy}
                          onClick={() => media.move(img.id, -1)}
                          data-trace-id={`place-media-move-left-${img.id}`}
                          className="text-white hover:text-white"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button" variant="ghost" size="icon-sm"
                          aria-label="Move right" disabled={idx === media.images.length - 1 || media.busy}
                          onClick={() => media.move(img.id, 1)}
                          data-trace-id={`place-media-move-right-${img.id}`}
                          className="text-white hover:text-white"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        type="button" variant="ghost" size="icon-sm"
                        aria-label="Delete photo" disabled={media.busy}
                        onClick={async () => {
                          setMediaError('');
                          try { await media.remove(img.id); }
                          catch (err) { setMediaError(err instanceof AdminApiError ? err.message : 'Delete failed. Try again.'); }
                        }}
                        data-trace-id={`place-media-delete-${img.id}`}
                        className="text-white hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex gap-3">
        <Button type="button" disabled={saving} onClick={(e) => {
          const form = document.getElementById('place-form') as HTMLFormElement | null;
          if (form) {
            form.requestSubmit();
          } else {
            e.preventDefault();
          }
        }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
        <Link href="/dashboard/places"><Button type="button" variant="outline">Cancel</Button></Link>
      </div>
    </div>
  );
}
