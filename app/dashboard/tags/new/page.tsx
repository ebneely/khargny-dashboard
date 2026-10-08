'use client';

import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { useState } from 'react';
import { FormActionBar } from '@/components/admin/form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin-client';

export default function NewTagPage() {
  const controlCopy = useDashboardCopy();
  const router = useRouter();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [nameEn, setNameEn] = useState('');

  const formChanges = useFormChanges({ name, nameEn, slug }, { name: '', nameEn: '', slug: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !slug) {
      setError('Name and slug are required');
      return;
    }
    setSaving(true);
    try {
      await adminApi.post('/v1/admin/tags', {
        name, slug, nameEn: nameEn || undefined,
      });
      router.push('/dashboard/tags');
      formChanges.markSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to create tag');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>New Tag</DashboardText></h1>
        <Link href="/dashboard/tags">
          <Button variant="outline"><DashboardText>Cancel</DashboardText></Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle><DashboardText>Tag Details</DashboardText></CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name"><DashboardText>Name *</DashboardText></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="مطعم" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn"><DashboardText>English Name</DashboardText></Label>
                <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder={controlCopy("Restaurant")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug"><DashboardText>Slug *</DashboardText></Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={controlCopy("restaurant")} />
            </div>

            <div className="flex gap-3 pt-4">
              <FormActionBar dirty={formChanges.dirty} saving={saving} error={error} disabled={saving} cancelHref="/dashboard/tags" />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
