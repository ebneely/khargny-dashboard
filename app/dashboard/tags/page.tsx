'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { useAdminTags } from '@/lib/api/hooks/use-admin-tags';

export default function TagsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useAdminTags();

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.nameEn && t.nameEn.toLowerCase().includes(q)) ||
        t.slug.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">Tags</h1>
        <Link href="/dashboard/tags/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Add Tag
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-3">Failed to load tags</p>
              <Button variant="outline" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>English Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>
                      <Link href={`/dashboard/tags/${tag.id}`} className="hover:text-orange-600 font-medium">
                        {tag.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tag.nameEn || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{tag.slug}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/tags/${tag.id}`}>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No tags found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
