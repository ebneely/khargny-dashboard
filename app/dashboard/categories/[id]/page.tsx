'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAdminCategory } from '@/lib/api/hooks/use-admin-categories';
import { adminApi } from '@/lib/api/admin-client';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: category, isLoading, isError } = useAdminCategory(id);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [status, setStatus] = useState('active');

  useEffect(() => {
    if (category) {
      setNameAr(category.nameAr);
      setNameEn(category.nameEn || '');
      setSlug(category.slug);
      setIcon(category.icon || '');
      setSortOrder(String(category.sortOrder));
      setStatus(category.status);
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await adminApi.patch(`/v1/admin/categories/${id}`, {
        nameAr, nameEn: nameEn || undefined, slug,
        icon: icon || undefined,
        sortOrder: parseInt(sortOrder),
        status,
      });
      router.push('/dashboard/categories');
    } catch (e: any) {
      setError(e.message || 'Failed to update category');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>;
  if (isError) return <div className="text-center py-8"><p className="text-muted-foreground mb-3">Failed to load category</p><Button variant="outline" onClick={() => window.location.reload()}>Retry</Button></div>;
  if (!category) return <div className="text-center py-8"><p className="text-muted-foreground">Category not found</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Edit Category</h1>
        <Link href="/dashboard/categories">
          <Button variant="outline">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Category Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nameAr">Name (Arabic) *</Label>
                <Input id="nameAr" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameEn">Name (English)</Label>
                <Input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Input id="icon" value={icon} onChange={(e) => setIcon(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input id="sortOrder" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => v && setStatus(v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              <Link href="/dashboard/categories"><Button type="button" variant="outline">Cancel</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
