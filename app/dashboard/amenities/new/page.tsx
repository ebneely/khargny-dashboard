'use client';

import { PageActions } from '@/components/admin/page-actions';

import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { useState } from 'react';
import { FormActionBar } from '@/components/admin/form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { useRouter } from 'next/navigation';


import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconPicker } from '@/components/icon-picker';
import { adminApi } from '@/lib/api/admin-client';

export default function NewAmenityPage() {
  const controlCopy = useDashboardCopy();
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [icon, setIcon] = useState('');

  const formChanges = useFormChanges({ name, nameEn, icon }, { name: '', nameEn: '', icon: '' });

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
      formChanges.markSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to create amenity');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>New Amenity</DashboardText></h1>
        <PageActions form actions={[{ label: "Cancel", href: "/dashboard/amenities", readOnly: true }]} />
      </div>

      <Card>
        <CardHeader><CardTitle><DashboardText>Amenity Details</DashboardText></CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="name"><DashboardText>Name *</DashboardText></Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="واي فاي مجاني" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameEn"><DashboardText>English Name</DashboardText></Label>
              <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={controlCopy("Free WiFi")} />
            </div>

            {/* Was a free-text input: an admin could save "wifi ", "WiFi" or any name no
                surface could draw, so amenity icons never rendered. Now a fixed catalog. */}
            <div className="space-y-2">
              <Label htmlFor="icon"><DashboardText>Icon</DashboardText></Label>
              <IconPicker value={icon} onChange={setIcon} traceId="create-amenity-icon" scope="amenity" />
            </div>

            <div className="flex gap-3 pt-4">
              <FormActionBar dirty={formChanges.dirty} saving={saving} error={error} disabled={saving} cancelHref="/dashboard/amenities" />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
