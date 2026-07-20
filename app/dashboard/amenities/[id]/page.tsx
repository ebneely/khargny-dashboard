'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconPicker } from '@/components/icon-picker';
import { useAdminAmenity } from '@/lib/api/hooks/use-admin-amenities';
import { adminApi } from '@/lib/api/admin-client';

export default function EditAmenityPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: amenity, isLoading, isError } = useAdminAmenity(id);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('');

  useEffect(() => {
    if (amenity) {
      setName(amenity.name);
      setNameEn(amenity.nameEn || '');
      setIcon(amenity.icon || '');
    }
  }, [amenity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await adminApi.patch(`/v1/admin/amenities/${id}`, {
        name, nameEn: nameEn || undefined, icon: icon || undefined,
      });
      router.push('/dashboard/amenities');
    } catch (e: any) {
      setError(e.message || 'Failed to update amenity');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>;
  if (isError) return <div className="text-center py-8"><p className="text-muted-foreground mb-3">Failed to load amenity</p><Button variant="outline" onClick={() => window.location.reload()}>Retry</Button></div>;
  if (!amenity) return <div className="text-center py-8"><p className="text-muted-foreground">Amenity not found</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Edit Amenity</h1>
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
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameEn">English Name</Label>
              <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            </div>

            {/* Catalog picker, not free text — see the create form for why. An icon saved
                before this change that isn't in the catalog shows as unselected here. */}
            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <IconPicker value={icon} onChange={setIcon} traceId="edit-amenity-icon" scope="amenity" />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              <Link href="/dashboard/amenities"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
