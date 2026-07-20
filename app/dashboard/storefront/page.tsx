'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, ArrowUp, ArrowDown, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/lib/api/admin-client';
import { SectionPlacesDialog } from '@/components/admin/section-places-dialog';
import { FooterSettingsCard } from '@/components/admin/footer-settings-card';
import { ListChecks } from 'lucide-react';

type Section = {
  id: string;
  key: string;
  titleAr: string;
  titleEn: string | null;
  kind: 'featured' | 'top_rated' | 'recommended' | 'custom';
  sortOrder: number;
  enabled: boolean;
};

const KIND_LABEL: Record<Section['kind'], string> = {
  featured: 'Featured',
  top_rated: 'Top rated',
  recommended: 'Recommended',
  custom: 'Custom (pinned)',
};

export default function StorefrontPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // create form
  const [key, setKey] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [kind, setKind] = useState<Section['kind']>('featured');
  const [creating, setCreating] = useState(false);
  const [managing, setManaging] = useState<Section | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.get<Section[]>('/v1/admin/storefront/sections');
      const list = Array.isArray(data) ? data : (data as any).data ?? [];
      setSections([...list].sort((a: Section, b: Section) => a.sortOrder - b.sortOrder));
    } catch (e: any) {
      setError(e.message || 'Failed to load sections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: Partial<Section>) => {
    await adminApi.patch(`/v1/admin/storefront/sections/${id}`, body);
    await load();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const a = sections[i], b = sections[j];
    // swap sortOrder
    await adminApi.patch(`/v1/admin/storefront/sections/${a.id}`, { sortOrder: b.sortOrder });
    await adminApi.patch(`/v1/admin/storefront/sections/${b.id}`, { sortOrder: a.sortOrder });
    await load();
  };

  const remove = async (id: string) => {
    await adminApi.delete(`/v1/admin/storefront/sections/${id}`);
    await load();
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key || !titleAr) { setError('Key and Arabic title are required'); return; }
    setCreating(true);
    setError('');
    try {
      await adminApi.post('/v1/admin/storefront/sections', {
        key, titleAr, titleEn: titleEn || undefined, kind,
        sortOrder: sections.length,
        enabled: true,
      });
      setKey(''); setTitleAr(''); setTitleEn(''); setKind('featured');
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to create section');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Storefront</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Control which sections appear on the public homepage and in what order.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <Card className="mb-6">
        <CardHeader><CardTitle>Homepage sections</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : sections.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">
              No sections yet. Add one below — it will show on the homepage.
            </p>
          ) : (
            <div className="space-y-2">
              {sections.map((s, i) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                  data-trace-id={`storefront-section-${s.key}`}
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={i === sections.length - 1}
                      onClick={() => move(i, 1)}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate">{s.titleAr}</span>
                      {s.titleEn && <span className="text-sm text-muted-foreground truncate">· {s.titleEn}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{KIND_LABEL[s.kind]}</Badge>
                      <code className="text-xs text-muted-foreground">{s.key}</code>
                    </div>
                  </div>
                  {/* Any section can be hand-curated by pinning places; non-custom sections
                      that have no pins still auto-fill by kind. */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setManaging(s)}
                    data-trace-id={`storefront-manage-${s.key}`}
                  >
                    <ListChecks className="h-4 w-4" />
                    Places
                  </Button>
                  <Button
                    variant={s.enabled ? 'outline' : 'secondary'}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => patch(s.id, { enabled: !s.enabled })}
                    data-trace-id={`storefront-toggle-${s.key}`}
                  >
                    {s.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {s.enabled ? 'Enabled' : 'Disabled'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete section"
                    onClick={() => remove(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add a section</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="key">Key *</Label>
                <Input id="key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="popular" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kind">Kind *</Label>
                <Select value={kind} onValueChange={(v) => v && setKind(v as Section['kind'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="top_rated">Top rated</SelectItem>
                    <SelectItem value="recommended">Recommended</SelectItem>
                    <SelectItem value="custom">Custom (pinned)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="titleAr">Title (Arabic) *</Label>
                <Input id="titleAr" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleEn">Title (English)</Label>
                <Input id="titleEn" value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={creating} className="gap-2">
              <Plus className="h-4 w-4" />
              {creating ? 'Adding…' : 'Add section'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <FooterSettingsCard />

      <SectionPlacesDialog
        sectionId={managing?.id ?? null}
        sectionTitle={managing ? managing.titleEn || managing.titleAr : null}
        open={managing !== null}
        onOpenChange={(o) => { if (!o) setManaging(null); }}
      />
    </div>
  );
}
