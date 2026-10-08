'use client';

import { useId } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOptionalDashboardLang } from '@/lib/dashboard-lang';
import { translateDashboardCopy } from '@/lib/dashboard-copy';

export function pageRange(skip: number, pageSize: number, total: number, count = pageSize) {
  return { start: total === 0 || count === 0 ? 0 : Math.min(skip + 1, total), end: count === 0 ? 0 : Math.min(skip + count, total), total };
}

export function Pager({ skip, pageSize, total, count, onPrevious, onNext, previousDisabled, nextDisabled, busy, error, pageSizes, onPageSizeChange }: {
  skip: number;
  pageSize: number;
  total?: number;
  count?: number;
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  busy?: boolean;
  error?: boolean;
  pageSizes?: number[];
  onPageSizeChange?: (size: number) => void;
}) {
  const lang = useOptionalDashboardLang()?.lang ?? 'en';
  const sizeId = useId();
  const text = (value: string) => translateDashboardCopy(value, lang);
  const range = pageRange(skip, pageSize, total ?? skip + (count ?? pageSize), count);
  const number = (value: number) => value.toLocaleString(lang);
  const PreviousIcon = lang === 'ar' ? ChevronRight : ChevronLeft;
  const NextIcon = lang === 'ar' ? ChevronLeft : ChevronRight;
  return <nav data-slot="pager" aria-label={text('Pagination')} className="flex flex-wrap items-center justify-between gap-3 border-t py-4">
    <p className="text-sm tabular-nums text-muted-foreground" aria-live="polite" aria-atomic="true">{busy || error ? text('Waiting for results') : `${number(range.start)} ${text('to')} ${number(range.end)}${total === undefined ? '' : ' ' + text('of') + ' ' + number(total)}`}</p>
    <div className="flex flex-wrap items-center gap-2">
      {pageSizes && onPageSizeChange && <div className="flex items-center gap-2"><label htmlFor={sizeId} className="text-sm">{text('Rows per page')}</label><Select value={String(pageSize)} onValueChange={(value) => { if (value) onPageSizeChange(Number(value)); }}><SelectTrigger id={sizeId}><SelectValue /></SelectTrigger><SelectContent>{pageSizes.map((size) => <SelectItem key={size} value={String(size)}>{number(size)}</SelectItem>)}</SelectContent></Select></div>}
      <Button data-ro-allow="true" type="button" variant="outline" size="sm" disabled={busy || (previousDisabled ?? skip === 0)} onClick={onPrevious} aria-label={text('Previous page')}><PreviousIcon aria-hidden="true" />{text('Previous')}</Button>
      <Button data-ro-allow="true" type="button" variant="outline" size="sm" disabled={busy || error || (nextDisabled ?? skip + pageSize >= (total ?? skip + pageSize))} onClick={onNext} aria-label={text('Next page')}><NextIcon aria-hidden="true" />{text('Next')}</Button>
    </div>
  </nav>;
}
