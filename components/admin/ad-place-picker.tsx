'use client';

import * as React from 'react';
import { Check, Loader2, MapPin, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi, toList } from '@/lib/api/admin-client';
import type { AdPlaceSummary } from '@/lib/api/ads';
import { useDashboardLang } from '@/lib/dashboard-lang';

export function AdPlacePicker({
  value,
  selectedPlace,
  onChange,
  disabled,
}: {
  value: string;
  selectedPlace: AdPlaceSummary | null;
  onChange: (place: AdPlaceSummary | null) => void;
  disabled?: boolean;
}) {
  const { lang, pick } = useDashboardLang();
  const [retryKey, setRetryKey] = React.useState(0);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<AdPlaceSummary[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const term = query.trim();
    if (!term || disabled) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await adminApi.get<unknown>('/v1/admin/places', {
          search: term,
          status: 'active',
          limit: 20,
        });
        if (!controller.signal.aborted) {
          setResults(toList<AdPlaceSummary>(response).items);
          setActiveIndex(0);
        }
      } catch {
        if (!controller.signal.aborted) setError(lang === 'ar' ? 'تعذر البحث عن الأماكن. أعد المحاولة.' : 'Could not search places. Try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, disabled, lang, retryKey]);

  const choose = (place: AdPlaceSummary) => {
    onChange(place);
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
  };

  if (value && selectedPlace) {
    return (
      <div className="flex min-h-11 items-center gap-3 rounded-(--radius-ds-lg) border bg-background px-3.5 py-2">
        <input id="ad-place-search" type="hidden" value={value} readOnly />
        <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{pick(selectedPlace.name, selectedPlace.nameEn)}</p>
          {selectedPlace.nameEn && selectedPlace.nameEn !== selectedPlace.name && (
            <p className="truncate text-xs text-muted-foreground">{selectedPlace.nameEn}</p>
          )}
        </div>
        {!disabled && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label={lang === 'ar' ? 'اختر مكاناً آخر' : 'Choose another place'}>
            <X className="size-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id="ad-place-search"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={Boolean(query.trim() && !loading && !error)}
          aria-controls="ad-place-results"
          aria-activedescendant={activeIndex >= 0 ? `ad-place-option-${results[activeIndex]?.id}` : undefined}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setResults([]);
            setActiveIndex(-1);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && results.length) {
              event.preventDefault();
              setActiveIndex((current) => Math.min(current + 1, results.length - 1));
            } else if (event.key === 'ArrowUp' && results.length) {
              event.preventDefault();
              setActiveIndex((current) => Math.max(current - 1, 0));
            } else if (event.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
              event.preventDefault();
              choose(results[activeIndex]);
            } else if (event.key === 'Escape') {
              setQuery('');
              setResults([]);
              setActiveIndex(-1);
            }
          }}
          placeholder={lang === 'ar' ? 'ابحث بالاسم عن مكان نشط…' : 'Search active places by name…'}
          aria-label={lang === 'ar' ? 'البحث عن مكان' : 'Search places'}
          className="ps-10"
          disabled={disabled}
          aria-describedby={error ? 'place-search-error' : undefined}
        />
        {loading && <Loader2 className="absolute end-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden="true" />}
      </div>
      {error && <div role="alert"><p id="place-search-error" className="text-sm text-destructive">{error}</p><Button type="button" variant="outline" onClick={() => setRetryKey((current) => current + 1)}>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</Button></div>}
      {query.trim() && !loading && !error && (
        <div id="ad-place-results" className="max-h-56 overflow-y-auto rounded-lg border bg-card" role="listbox" aria-label={lang === 'ar' ? 'نتائج البحث عن الأماكن' : 'Place search results'}>
          {results.length > 0 ? results.map((place, index) => (
            <button
              id={`ad-place-option-${place.id}`}
              key={place.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(place)}
              className={index === activeIndex
                ? 'flex w-full items-center gap-3 border-b bg-muted px-3 py-2.5 text-start last:border-b-0 focus-visible:outline-none'
                : 'flex w-full items-center gap-3 border-b px-3 py-2.5 text-start last:border-b-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none'}
            >
              <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{pick(place.name, place.nameEn)}</span>
                {place.nameEn && <span className="block truncate text-xs text-muted-foreground">{place.nameEn}</span>}
              </span>
              {index === activeIndex && <Check className="size-4 text-primary" aria-hidden="true" />}
            </button>
          )) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{lang === 'ar' ? 'لا توجد أماكن نشطة تطابق البحث.' : 'No active places match this search.'}</p>
          )}
        </div>
      )}
    </div>
  );
}
