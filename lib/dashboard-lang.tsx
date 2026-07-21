'use client';

import * as React from 'react';

export type DashLang = 'ar' | 'en';

interface DashLangValue {
  /** Which language the dashboard's NAMES and dropdown labels are shown in. */
  lang: DashLang;
  setLang: (l: DashLang) => void;
  /**
   * Pick the label to display for a bilingual record, in the viewed language, falling back
   * to the other so a label is never blank. The stored value that reaches the backend is the
   * record's id — both languages already live on the row — so this only affects what the
   * editor SEES, never what is saved.
   */
  pick: (ar: string | null | undefined, en: string | null | undefined) => string;
}

const KEY = 'khargny.dashboard.lang';
const DashLangContext = React.createContext<DashLangValue | null>(null);

export function DashboardLangProvider({ children }: { children: React.ReactNode }) {
  // Arabic is the product's primary language, so it's the default view.
  const [lang, setLangState] = React.useState<DashLang>('ar');

  // Restore the saved choice on mount. Kept in localStorage (a view preference, not a
  // secret) so it survives navigation and refresh.
  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored === 'ar' || stored === 'en') setLangState(stored);
    } catch {
      /* storage unavailable — the in-memory default applies */
    }
  }, []);

  const setLang = React.useCallback((l: DashLang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const value = React.useMemo<DashLangValue>(
    () => ({
      lang,
      setLang,
      pick: (ar, en) => {
        const a = (ar ?? '').trim();
        const e = (en ?? '').trim();
        return (lang === 'ar' ? a || e : e || a) || '';
      },
    }),
    [lang, setLang],
  );

  return <DashLangContext.Provider value={value}>{children}</DashLangContext.Provider>;
}

export function useDashboardLang(): DashLangValue {
  const ctx = React.useContext(DashLangContext);
  if (!ctx) throw new Error('useDashboardLang must be used within DashboardLangProvider');
  return ctx;
}
