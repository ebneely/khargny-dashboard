'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { IconPicker } from '@/components/icon-picker';
import { adminApi } from '@/lib/api/admin-client';
import { autoSlug } from '@/lib/utils/slug';
import type { AdminApiError } from '@/lib/api/admin-client';

type ParentOption = { id: string; nameAr: string };

export default function NewCategoryPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [slugError, setSlugError] = useState('');
  const [saving, setSaving] = useState(false);
  const [parents, setParents] = useState<ParentOption[]>([]);

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [icon, setIcon] = useState('');
  const [parentId, setParentId] = useState<string | null>('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    (async () => {
      try {
        const result = await adminApi.get<ParentOption[]>('/v1/admin/categories');
        setParents(Array.isArray(result) ? result : []);
      } catch {
        setParents([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (slugTouched) return;
    const generated = autoSlug(nameAr, nameEn);
    setSlug(generated);
  }, [nameAr, nameEn, slugTouched]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSlugError('');
    if (!nameAr || !slug) {
      setError('Arabic name and slug are required');
      return;
    }
    setSaving(true);
    try {
      await adminApi.post('/v1/admin/categories', {
        nameAr, nameEn: nameEn || undefined, slug,
        icon: icon || undefined,
        parentId: parentId || undefined,
        sortOrder: parseInt(sortOrder, 10) || 0,
        status,
      });
      router.push('/dashboard/categories');
    } catch (e: any) {
      const err = e as AdminApiError;
      if (err.status === 409) {
        setSlugError('This slug is already in use. Please choose a different one.');
        setSlugTouched(true);
      } else {
        setError(err.message || 'Failed to create category');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-2">
        <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        <span className="mx-2">/</span>
        <Link href="/dashboard/categories" className="hover:text-foreground">Categories</Link>
        <span className="mx-2">/</span>
        <span className="text-foreground">New</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">New Category</h1>
        <Link href="/dashboard/categories">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Category Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nameAr">Name (Arabic) *</Label>
                <Input
                  id="nameAr"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  data-trace-id="create-category-name-ar"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">Name (English)</Label>
                <Input
                  id="nameEn"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  data-trace-id="create-category-name-en"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); setSlugError(''); }}
                  placeholder="category-slug"
                  data-trace-id="create-category-slug"
                  aria-invalid={!!slugError}
                  aria-describedby={slugError ? 'create-category-slug-error' : undefined}
                  required
                />
                {slugError && (
                  <p id="create-category-slug-error" className="text-sm text-destructive" data-trace-id="create-category-slug-error" role="alert">
                    {slugError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <IconPicker value={icon} onChange={setIcon} traceId="create-category-icon" scope="category" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parentId">Parent category</Label>
                <Select value={parentId || '__none__'} onValueChange={(v) => setParentId(v === '__none__' ? '' : v)}>
                  <SelectTrigger data-trace-id="create-category-parent">
                    <SelectValue placeholder="(none — top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">(none — top-level)</SelectItem>
                    {parents.map((p) => (
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
                  data-trace-id="create-category-sort"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                <SelectTrigger className="w-32" data-trace-id="create-category-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving} data-trace-id="create-category-save">
                {saving ? 'Saving…' : 'Create Category'}
              </Button>
              <Link href="/dashboard/categories">
                <Button type="button" variant="outline" data-trace-id="create-category-cancel">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
