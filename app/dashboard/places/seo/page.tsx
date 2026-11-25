'use client';

import * as React from 'react';
import Link from '@/components/lang-link';
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Search,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FilterBar, FilterSelect } from '@/components/admin/filter-bar';
import { Pager } from '@/components/admin/pager';
import { RecordCell } from '@/components/admin/record-cell';
import { useDashboardCopy } from '@/components/admin/dashboard-text';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { useAdminCities } from '@/lib/api/hooks/use-admin-cities';
import { useAdminCategories } from '@/lib/api/hooks/use-admin-categories';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { adminApi } from '@/lib/api/admin-client';
import { localeFor } from '@/lib/locale';

interface SeoListItem {
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  status: string;
  city: { slug: string; name: string; nameEn: string | null };
  category: { name: string; nameEn: string | null };
  score: number | null;
  namePosition: { en: number | null; ar: number | null };
  impressions: number;
  clicks: number;
  indexed: { en: boolean | null; ar: boolean | null };
  computedAt: string | null;
}
interface SeoList {
  items: SeoListItem[];
  total: number;
  nextCursor: string | null;
}

const scoreStatus = (score: number | null) =>
  score === null ? 'unknown' : score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

function ScoreIcon({ score }: { score: number | null }) {
  const status = scoreStatus(score);
  if (status === 'pass')
    return <CheckCircle2 className="size-4 text-success" aria-hidden="true" />;
  if (status === 'warn')
    return <AlertTriangle className="size-4 text-warning" aria-hidden="true" />;
  if (status === 'fail')
    return <XCircle className="size-4 text-destructive" aria-hidden="true" />;
  return <CircleHelp className="size-4 text-muted-foreground" aria-hidden="true" />;
}

function IndexMark({ value }: { value: boolean | null }) {
  const copy = useDashboardCopy();
  if (value === null)
    return <span className="text-muted-foreground">{copy('—')}</span>;
  return value ? (
    <span className="inline-flex items-center gap-1 text-success">
      <CheckCircle2 className="size-4" aria-hidden="true" />
      {copy('Indexed')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-destructive">
      <XCircle className="size-4" aria-hidden="true" />
      {copy('Not indexed')}
    </span>
  );
}

/** Places > SEO: every place, weakest score first, filters by city and category. */
export default function PlacesSeoPage() {
  const copy = useDashboardCopy();
  const { lang } = useDashboardLang();
  const [city, setCity] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [sort, setSort] = React.useState('score');
  const [cursors, setCursors] = React.useState<(string | null)[]>([null]);
  const [at, setAt] = React.useState(0);
  const cursor = cursors[at] ?? null;
  const { data: cities } = useAdminCities({ limit: 100 });
  const { data: categories } = useAdminCategories();
  const load = React.useCallback(
    () =>
      adminApi.get<SeoList>('/v1/admin/seo/places', {
        sort,
        order: sort === 'score' ? 'asc' : 'desc',
        city: city || undefined,
        category: category || undefined,
        limit: 50,
        cursor: cursor || undefined,
      }),
    [sort, city, category, cursor],
  );
  const resource = useSubscriberResource(load);
  const data = resource.data;
  const n = (value: number | null | undefined) =>
    value === null || value === undefined
      ? '—'
      : value.toLocaleString(localeFor(lang));
  const reset = () => {
    setCursors([null]);
    setAt(0);
  };
  const next = () => {
    if (!data?.nextCursor) return;
    setCursors((current) => [...current.slice(0, at + 1), data.nextCursor]);
    setAt((current) => current + 1);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-foreground">
            <Search className="size-5 text-primary" aria-hidden="true" />
            {copy('SEO')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy('Every place, weakest SEO score first. Open a place to see its Google numbers and fixes.')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>{copy('All places')}</CardTitle>
          <FilterBar filters={3}>
            <FilterSelect
              label="Any city"
              value={city || 'all'}
              onValueChange={(value) => {
                setCity(value === 'all' ? '' : value);
                reset();
              }}
              options={[
                { value: 'all', label: 'Any city' },
                ...(cities?.items ?? []).map((item) => ({
                  value: item.id,
                  label: (lang === 'ar' ? item.name || item.nameEn : item.nameEn || item.name) || '—',
                })),
              ]}
            />
            <FilterSelect
              label="Any category"
              value={category || 'all'}
              onValueChange={(value) => {
                setCategory(value === 'all' ? '' : value);
                reset();
              }}
              options={[
                { value: 'all', label: 'Any category' },
                ...(categories ?? []).map((item) => ({
                  value: item.id,
                  label: (lang === 'ar' ? item.nameAr || item.nameEn : item.nameEn || item.nameAr) || '—',
                })),
              ]}
            />
            <FilterSelect
              label="Sort by"
              value={sort}
              onValueChange={(value) => {
                setSort(value);
                reset();
              }}
              options={[
                { value: 'score', label: 'Score, weakest first' },
                { value: 'name_position', label: 'Name position' },
                { value: 'impressions', label: 'Most impressions' },
              ]}
            />
          </FilterBar>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-sm text-muted-foreground tabular-nums">
            {n(data?.total)} {copy('places')}
          </p>
          {resource.error ? (
            <div className="py-6">
              <p className="text-sm text-muted-foreground">{copy('Could not load the SEO list.')}</p>
              <Button className="mt-3" variant="outline" onClick={() => void resource.refetch()}>
                {copy('Retry')}
              </Button>
            </div>
          ) : resource.loading && !data ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <p className="py-6 text-sm text-muted-foreground">
              {copy('No places match these filters.')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy('Name')}</TableHead>
                    <TableHead>{copy('Score')}</TableHead>
                    <TableHead>{copy('Name position')}</TableHead>
                    <TableHead className="text-end">{copy('Impressions')}</TableHead>
                    <TableHead className="text-end">{copy('Clicks')}</TableHead>
                    <TableHead>{copy('Indexed')}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Link href={`/dashboard/places/${item.id}?tab=seo`} className="block hover:text-primary">
                          <RecordCell
                            nameAr={item.name}
                            nameEn={item.nameEn}
                            icon="location"
                            context={`${lang === 'ar' ? item.city.name : item.city.nameEn || item.city.name} · ${lang === 'ar' ? item.category.name : item.category.nameEn || item.category.name}`}
                          />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 tabular-nums">
                          <ScoreIcon score={item.score} />
                          {n(item.score)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {n(item.namePosition.en)} / {n(item.namePosition.ar)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">{n(item.impressions)}</TableCell>
                      <TableCell className="text-end tabular-nums">{n(item.clicks)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <IndexMark value={item.indexed.en} />
                          <span className="text-muted-foreground">/</span>
                          <IndexMark value={item.indexed.ar} />
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          nativeButton={false}
                          render={<Link href={`/dashboard/places/${item.id}?tab=seo`} />}
                        >
                          {copy('Open SEO')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Pager
            skip={at * 50}
            pageSize={50}
            total={data?.total}
            count={data?.items.length}
            onPrevious={() => setAt((current) => Math.max(0, current - 1))}
            onNext={next}
            previousDisabled={at === 0}
            nextDisabled={!data?.nextCursor}
            busy={resource.loading}
            error={Boolean(resource.error)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
