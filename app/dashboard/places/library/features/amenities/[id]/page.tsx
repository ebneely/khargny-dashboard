'use client';

import { PageActions } from '@/components/admin/page-actions';

import { DashboardText } from '@/components/admin/dashboard-text';
import { useState } from 'react';
import { FormActionBar } from '@/components/admin/form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { useParams } from 'next/navigation';
import { useRouter } from '@/lib/dash-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IconPicker } from '@/components/icon-picker';
import { useAdminAmenity } from '@/lib/api/hooks/use-admin-amenities';
import { adminApi } from '@/lib/api/admin-client';

type AmenityDraft = { name: string; nameEn: string; icon: string };

export default function EditAmenityPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: amenity, isLoading, isError } = useAdminAmenity(id);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Edits overlay the loaded amenity, so the form needs no effect to seed it.
  const [draft, setDraft] = useState<Partial<AmenityDraft>>({});
  const name = draft.name ?? amenity?.name ?? '';
  const nameEn = draft.nameEn ?? amenity?.nameEn ?? '';
  const icon = draft.icon ?? amenity?.icon ?? '';

  const formChanges = useFormChanges({ name, nameEn, icon }, { name: amenity ? amenity.name : '', nameEn: amenity ? amenity.nameEn || '' : '', icon: amenity ? amenity.icon || '' : '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await adminApi.patch(`/v1/admin/amenities/${id}`, {
        name, nameEn: nameEn || undefined, icon: icon || undefined,
      });
      router.push('/dashboard/places/library/features');
      formChanges.markSaved();
    } catch (e) {
      setError((e as Error).message || 'Failed to update amenity');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>;
  if (isError) return <div className="text-center py-8"><p className="text-muted-foreground mb-3"><DashboardText>Failed to load amenity</DashboardText></p><Button variant="outline" onClick={() => window.location.reload()}><DashboardText>Retry</DashboardText></Button></div>;
  if (!amenity) return <div className="text-center py-8"><p className="text-muted-foreground"><DashboardText>Amenity not found</DashboardText></p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Edit Amenity</DashboardText></h1>
        <PageActions form actions={[{ label: "Cancel", href: "/dashboard/places/library/features", readOnly: true }]} />
      </div>

      <Card>
        <CardHeader><CardTitle><DashboardText>Amenity Details</DashboardText></CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              <Label htmlFor="name"><DashboardText>Name *</DashboardText></Label>
              <Input id="name" value={name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameEn"><DashboardText>English Name</DashboardText></Label>
              <Input id="nameEn" value={nameEn} onChange={(e) => setDraft((d) => ({ ...d, nameEn: e.target.value }))} />
            </div>

            {/* Catalog picker, not free text — see the create form for why. An icon saved
                before this change that isn't in the catalog shows as unselected here. */}
            <div className="space-y-2">
              <Label htmlFor="icon"><DashboardText>Icon</DashboardText></Label>
              <IconPicker value={icon} onChange={(value) => setDraft((d) => ({ ...d, icon: value }))} traceId="edit-amenity-icon" scope="amenity" />
            </div>

            <div className="flex gap-3 pt-4">
              <FormActionBar dirty={formChanges.dirty} saving={saving} error={error} disabled={saving} cancelHref="/dashboard/places/library/features" />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
