'use client';

import { DashboardText } from '@/components/admin/dashboard-text';
import { useState, useEffect, useMemo } from 'react';
import { FormActionBar } from '@/components/admin/form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAdminCategory } from '@/lib/api/hooks/use-admin-categories';
import { useAdminCategories } from '@/lib/api/hooks/use-admin-categories';
import { adminApi } from '@/lib/api/admin-client';
import { CategoryDeleteDialog } from '@/components/admin/category-delete-dialog';
import { Badge } from '@/components/ui/badge';
import type { AdminApiError } from '@/lib/api/admin-client';

type ParentOption = { id: string; nameAr: string };

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: cat, isLoading, isError, refetch } = useAdminCategory(id);
  const { data: allCategories } = useAdminCategories();

  const [error, setError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('');
  const [parentId, setParentId] = useState<string | null>('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (cat) {
      setNameAr(cat.nameAr);
      setNameEn(cat.nameEn || '');
      setSlug(cat.slug);
      setIcon(cat.icon || '');
      setParentId(((cat as { parentId?: string | null }).parentId ?? '') as string);
      setSortOrder(String(cat.sortOrder));
      setStatus(cat.status);
    }
  }, [cat]);

  const parentOptions: ParentOption[] = useMemo(
    () => (allCategories ?? []).filter((c) => c.id !== id),
    [allCategories, id],
  );

  const formChanges = useFormChanges({ nameAr, nameEn, slug, icon, parentId, sortOrder, status }, { nameAr: cat ? cat.nameAr : '', nameEn: cat ? cat.nameEn || '' : '', slug: cat ? cat.slug : '', icon: cat ? cat.icon || '' : '', parentId: cat ? ((cat as { parentId?: string | null }).parentId ?? '') as string : '', sortOrder: cat ? String(cat.sortOrder) : '0', status: cat ? cat.status : 'active' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSlugError('');
    setSaving(true);
    try {
      await adminApi.patch(`/v1/admin/categories/${id}`, {
        nameAr, nameEn: nameEn || undefined, slug,
        icon: icon || undefined,
        parentId: parentId || undefined,
        sortOrder: parseInt(sortOrder, 10) || 0,
        status,
      });
      setError('');
      await refetch();
      formChanges.markSaved();
    } catch (e: any) {
      const err = e as AdminApiError;
      if (err.status === 409) {
        setSlugError('This slug is already in use. Please choose a different one.');
      } else {
        setError(err.message || 'Failed to update category');
      }
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (isError || !cat) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-3" role="alert"><DashboardText>Category not found</DashboardText></p>
        <Link href="/dashboard/categories">
          <Button variant="outline"><DashboardText>Back to categories</DashboardText></Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground"><DashboardText>Dashboard</DashboardText></Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/categories" className="hover:text-foreground"><DashboardText>Categories</DashboardText></Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">{cat.nameAr}</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Edit Category</DashboardText></h1>
          <Badge variant={cat.status === 'active' ? 'default' : 'secondary'}>
            {cat.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="gap-2"
            onClick={() => setDeleteOpen(true)}
            data-trace-id="edit-category-delete"
          >
            <Trash2 className="w-4 h-4" /> <DashboardText>Delete</DashboardText>
          </Button>
          <Link href="/dashboard/categories">
            <Button variant="outline"><DashboardText>Cancel</DashboardText></Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle><DashboardText>Category Details</DashboardText></CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nameAr"><DashboardText>Name (Arabic) *</DashboardText></Label>
                <Input
                  id="nameAr"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  data-trace-id="edit-category-name-ar"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn"><DashboardText>Name (English)</DashboardText></Label>
                <Input
                  id="nameEn"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  data-trace-id="edit-category-name-en"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="slug"><DashboardText>Slug *</DashboardText></Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugError(''); }}
                  data-trace-id="edit-category-slug"
                  aria-invalid={!!slugError}
                  aria-describedby={slugError ? 'edit-category-slug-error' : undefined}
                  required
                />
                {slugError && (
                  <p id="edit-category-slug-error" className="text-sm text-destructive" data-trace-id="edit-category-slug-error" role="alert">
                    {slugError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon"><DashboardText>Icon</DashboardText></Label>
                <Input
                  id="icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  data-trace-id="edit-category-icon"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parentId"><DashboardText>Parent category</DashboardText></Label>
                <Select value={(parentId || '__none__')} onValueChange={(v) => setParentId(v === '__none__' ? '' : v)}>
                  <SelectTrigger data-trace-id="edit-category-parent">
                    <SelectValue placeholder="(none — top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__"><DashboardText>(none — top-level)</DashboardText></SelectItem>
                    {parentOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder"><DashboardText>Sort order</DashboardText></Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  data-trace-id="edit-category-sort"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status"><DashboardText>Status</DashboardText></Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger className="w-32" data-trace-id="edit-category-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active"><DashboardText>Active</DashboardText></SelectItem>
                  <SelectItem value="draft"><DashboardText>Draft</DashboardText></SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <FormActionBar dirty={formChanges.dirty} saving={saving} error={error || slugError} disabled={saving} cancelHref="/dashboard/categories" traceId="edit-category-save" />
            </div>
          </form>
        </CardContent>
      </Card>

      <CategoryDeleteDialog
        categoryId={cat.id}
        categoryName={cat.nameAr}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.push('/dashboard/categories')}
      />
    </div>
  );
}
