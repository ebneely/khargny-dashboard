'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { IconPicker } from '@/components/icon-picker';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';
import type { AdminCategory } from '@/lib/api/types';

type ParentOption = { id: string; nameAr: string };

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [error, setError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parents, setParents] = useState<ParentOption[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('');
  const [parentId, setParentId] = useState<string | null>('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState<'active' | 'draft'>('active');

  useEffect(() => {
    (async () => {
      try {
        const [cat, list] = await Promise.all([
          adminApi.get<AdminCategory>(`/v1/admin/categories/${id}`),
          adminApi.get<ParentOption[]>('/v1/admin/categories'),
        ]);
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

  const handleDelete = async () => {
    setError('');
    setDeleting(true);
    try {
      await adminApi.delete(`/v1/admin/categories/${id}`);
      router.push('/dashboard/categories');
    } catch (e: unknown) {
      const err = e as AdminApiError;
      setError(err.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
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
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/categories" className="hover:text-foreground">Categories</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">Edit</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Edit Category</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 text-destructive"
            onClick={() => setConfirmDelete(true)}
            data-trace-id="edit-category-delete"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
          <Link href="/dashboard/categories">
            <Button variant="outline" data-trace-id="edit-category-cancel-top">Cancel</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Category Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <p className="text-sm text-destructive" role="alert" data-trace-id="edit-category-error">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nameAr">Name (Arabic) *</Label>
                <Input
                  id="nameAr"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  data-trace-id="edit-category-name-ar"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">Name (English) *</Label>
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
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugError(''); }}
                  placeholder="category-slug"
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
                <Label htmlFor="icon">Icon</Label>
                <IconPicker value={icon} onChange={setIcon} traceId="edit-category-icon" scope="category" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent category</Label>
                <Select
                  value={parentId || '__none__'}
                  onValueChange={(v) => setParentId(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger data-trace-id="edit-category-parent">
                    <SelectValue placeholder="(none — top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">(none — top-level)</SelectItem>
                    {parents
                      .filter((p) => p.id !== id) // a category cannot be its own parent
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nameAr}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort order</Label>
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
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as 'active' | 'draft')}>
                <SelectTrigger className="w-32" data-trace-id="edit-category-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving} data-trace-id="edit-category-save">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              <Link href="/dashboard/categories">
                <Button type="button" variant="outline" data-trace-id="edit-category-cancel">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          data-trace-id="edit-category-delete-confirm"
          role="dialog"
          aria-modal="true"
        >
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Delete this category?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This will remove the category and break any place currently
                filed under it. This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  data-trace-id="edit-category-delete-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  data-trace-id="edit-category-delete-confirm-btn"
                >
                  {deleting ? 'Deleting…' : 'Delete category'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
