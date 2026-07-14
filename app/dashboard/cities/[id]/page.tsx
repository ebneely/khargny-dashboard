'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAdminCity } from '@/lib/api/hooks/use-admin-cities';
import { adminApi } from '@/lib/api/admin-client';

export default function EditCityPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: city, isLoading, isError } = useAdminCity(id);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [region, setRegion] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    if (city) {
      setName(city.name);
      setNameEn(city.nameEn || '');
      setSlug(city.slug);
      setRegion(city.region || '');
      setDescriptionAr(city.descriptionAr || '');
      setDescriptionEn(city.descriptionEn || '');
      setLat(city.lat ? String(city.lat) : '');
      setLng(city.lng ? String(city.lng) : '');
      setFeatured(city.featured);
      setStatus(city.status);
    }
  }, [city]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await adminApi.patch(`/v1/admin/cities/${id}`, {
        name, nameEn: nameEn || undefined, slug,
        region: region || undefined,
        descriptionAr: descriptionAr || undefined, descriptionEn: descriptionEn || undefined,
        lat: lat ? parseFloat(lat) : undefined, lng: lng ? parseFloat(lng) : undefined,
        featured, status,
      });
      router.push('/dashboard/cities');
    } catch (e: any) {
      setError(e.message || 'Failed to update city');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>;
  if (isError) return <div className="text-center py-8"><p className="text-muted-foreground mb-3">Failed to load city</p><Button variant="outline" onClick={() => window.location.reload()}>Retry</Button></div>;
  if (!city) return <div className="text-center py-8"><p className="text-muted-foreground">City not found</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Edit City</h1>
        <Link href="/dashboard/cities">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>City Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="descriptionAr">Description (Arabic)</Label>
                <Input id="descriptionAr" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descriptionEn">Description (English)</Label>
                <Input id="descriptionEn" value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat">Latitude</Label>
                <Input id="lat" type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">Longitude</Label>
                <Input id="lng" type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
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
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              <Link href="/dashboard/cities"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
