'use client';

import { PageActions } from '@/components/admin/page-actions';

import { DashboardText, useDashboardCopy } from '@/components/admin/dashboard-text';
import { useEffect, useState } from 'react';
import { FormActionBar } from '@/components/admin/form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';


import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CategoryDeleteDialog } from '@/components/admin/category-delete-dialog';
import { IconPicker } from '@/components/icon-picker';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import type { AdminCategory } from '@/lib/api/types';

type ParentOption = { id: string; nameAr: string };

export default function EditCategoryPage() {
  const controlCopy = useDashboardCopy();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [error, setError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('');
  const [parentId, setParentId] = useState<string | null>('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState<'active' | 'draft'>('active');

  const [originalValues, setOriginalValues] = useState<unknown>({ nameAr: '', nameEn: '', slug: '', icon: '', parentId: '', sortOrder: '0', status: 'active' });
  useEffect(() => {
    (async () => {
      try {
        const [cat, list] = await Promise.all([
          adminApi.get<AdminCategory>(`/v1/admin/categories/${id}`),
          adminApi.get<ParentOption[]>('/v1/admin/categories'),
        ]);
        setOriginalValues({ nameAr: cat.nameAr, nameEn: cat.nameEn ?? '', slug: cat.slug, icon: cat.icon ?? '', parentId: cat.parentId ?? '', sortOrder: String(cat.sortOrder ?? 0), status: cat.status });
        setNameAr(cat.nameAr);
        setNameEn(cat.nameEn ?? '');
        setSlug(cat.slug);
        setIcon(cat.icon ?? '');
        setParentId(cat.parentId ?? '');
        setSortOrder(String(cat.sortOrder ?? 0));
        setStatus(cat.status);
        setParents(Array.isArray(list) ? list : []);
      } catch {
        setError('Failed to load category');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const formChanges = useFormChanges({ nameAr, nameEn, slug, icon, parentId, sortOrder, status }, originalValues);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSlugError('');
    if (!nameEn.trim()) {
      setError('English name is required — every category must have both languages.');
      return;
    }
    if (!nameAr || !slug) {
      setError('Arabic name and slug are required');
      return;
    }
    setSaving(true);
    try {
      await adminApi.patch(`/v1/admin/categories/${id}`, {
        nameAr,
        nameEn: nameEn || undefined,
        slug,
        icon: icon || undefined,
        parentId: parentId || undefined,
        sortOrder: parseInt(sortOrder, 10) || 0,
        status,
      });
      router.push('/dashboard/categories');
      formChanges.markSaved();
    } catch (e: unknown) {
      const err = e as AdminApiError;
      if (err.status === 409) {
        setSlugError('This slug is already in use. Please choose a different one.');
      } else {
        setError(err.message || 'Failed to save category');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <nav aria-label={controlCopy("Breadcrumb")} className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground"><DashboardText>Dashboard</DashboardText></Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/categories" className="hover:text-foreground"><DashboardText>Categories</DashboardText></Link>
        <span className="mx-2">/</span>
        <span className="text-foreground"><DashboardText>Edit</DashboardText></span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Edit Category</DashboardText></h1>
        <div className="flex gap-2">
          <PageActions form actions={[{ label: "Delete", onClick: () => setConfirmDelete(true), traceId: "edit-category-delete" }]} />
          <PageActions form actions={[{ label: "Cancel", href: "/dashboard/categories", traceId: "edit-category-cancel-top", readOnly: true }]} />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle><DashboardText>Category Details</DashboardText></CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p className="text-sm text-destructive" role="alert" data-trace-id="edit-category-error">
                {error}
              </p>
            )}

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
                <Label htmlFor="nameEn"><DashboardText>Name (English) *</DashboardText></Label>
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
                  placeholder={controlCopy("category-slug")}
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
                <IconPicker value={icon} onChange={setIcon} traceId="edit-category-icon" scope="category" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parentId"><DashboardText>Parent category</DashboardText></Label>
                <Select
                  value={parentId || '__none__'}
                  onValueChange={(v) => setParentId(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger data-trace-id="edit-category-parent">
                    <SelectValue placeholder={controlCopy("(none — top-level)")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__"><DashboardText>(none — top-level)</DashboardText></SelectItem>
                    {parents
                      .filter((p) => p.id !== id) // a category cannot be its own parent
                      .map((p) => (
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
              <Select value={status} onValueChange={(v) => v && setStatus(v as 'active' | 'draft')}>
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

      <CategoryDeleteDialog categoryId={id} categoryName={nameAr} open={confirmDelete} onOpenChange={setConfirmDelete} onDeleted={() => { setConfirmDelete(false); router.push('/dashboard/categories'); }} />
    </div>
  );
}
