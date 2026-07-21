'use client';

import { useDashboardLang, type DashLang } from '@/lib/dashboard-lang';
import { cn } from '@/lib/utils';

/**
 * Global EN / ع view toggle for the dashboard.
 *
 * The dashboard stores both languages on every record; this switch changes only which one
 * is SHOWN — in name columns, in dropdown options, everywhere a bilingual label renders. It
 * never changes what is saved (records are selected by id, so both languages always reach
 * the backend). Persisted per-browser via the provider.
 */
export function DashboardLangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useDashboardLang();

  const seg = (value: DashLang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      aria-pressed={lang === value}
      // Exempt from the read-only viewer gate: it's a view preference, not a data edit.
      data-ro-allow="true"
      className={cn(
        'rounded px-2.5 py-1 text-xs font-semibold transition-colors',
        lang === value
          ? 'bg-[var(--brand-600)] text-white'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );

  return (
    <div
      className={cn('inline-flex items-center rounded-md border border-border p-0.5', className)}
      role="group"
      aria-label="View language"
    >
      {seg('en', 'EN')}
      {seg('ar', 'ع')}
    </div>
  );
}
