'use client';

import { PageActions } from '@/components/admin/page-actions';

import { DashboardText } from '@/components/admin/dashboard-text';
import { useState, useEffect } from 'react';
import { FormActionBar } from '@/components/admin/form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { useRouter, useParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminTag } from '@/lib/api/hooks/use-admin-tags';
import { adminApi } from '@/lib/api/admin-client';

export default function EditTagPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: tag, isLoading, isError } = useAdminTag(id);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Delete this tag? This cannot be undone.')) return;
    setError('');
    setDeleting(true);
    try {
      await adminApi.delete(`/v1/admin/tags/${id}`);
      router.push('/dashboard/tags');
    } catch (e: any) {
      setError(e.message || 'Failed to delete tag');
      setDeleting(false);
    }
  };

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [nameEn, setNameEn] = useState('');

  useEffect(() => {
    if (tag) {
      setName(tag.name);
      setSlug(tag.slug);
      setNameEn(tag.nameEn || '');
    }
  }, [tag]);

  const formChanges = useFormChanges({ name, nameEn, slug }, { name: tag ? tag.name : '', nameEn: tag ? tag.nameEn || '' : '', slug: tag ? tag.slug : '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await adminApi.patch(`/v1/admin/tags/${id}`, {
        name, slug, nameEn: nameEn || undefined,
      });
      router.push('/dashboard/tags');
      formChanges.markSaved();
    } catch (e: any) {
      setError(e.message || 'Failed to update tag');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>;
  if (isError) return <div className="text-center py-8"><p className="text-muted-foreground mb-3"><DashboardText>Failed to load tag</DashboardText></p><Button variant="outline" onClick={() => window.location.reload()}><DashboardText>Retry</DashboardText></Button></div>;
  if (!tag) return <div className="text-center py-8"><p className="text-muted-foreground"><DashboardText>Tag not found</DashboardText></p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Edit Tag</DashboardText></h1>
        <PageActions form actions={[{ label: "Cancel", href: "/dashboard/tags", readOnly: true }]} />
      </div>

      <Card>
        <CardHeader><CardTitle><DashboardText>Tag Details</DashboardText></CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name"><DashboardText>Name *</DashboardText></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn"><DashboardText>English Name</DashboardText></Label>
                <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug"><DashboardText>Slug *</DashboardText></Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>

            <div className="flex items-center justify-between pt-4">
              <FormActionBar dirty={formChanges.dirty} saving={saving} error={error} disabled={saving || deleting} cancelHref="/dashboard/tags" />
              <Button
                type="button"
                variant="destructive"
                disabled={saving || deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Deleting…' : 'Delete tag'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
