'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconPicker } from '@/components/icon-picker';
import { adminApi } from '@/lib/api/admin-client';

export default function NewAmenityPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      await adminApi.post('/v1/admin/amenities', {
        name, nameEn: nameEn || undefined, icon: icon || undefined,
      });
      router.push('/dashboard/amenities');
    } catch (e: any) {
      setError(e.message || 'Failed to create amenity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">New Amenity</h1>
        <Link href="/dashboard/amenities">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Amenity Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="واي فاي مجاني" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameEn">English Name</Label>
              <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Free WiFi" />
            </div>

            {/* Was a free-text input: an admin could save "wifi ", "WiFi" or any name no
                surface could draw, so amenity icons never rendered. Now a fixed catalog. */}
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <IconPicker value={icon} onChange={setIcon} traceId="create-amenity-icon" scope="amenity" />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Create Amenity'}</Button>
              <Link href="/dashboard/amenities"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
