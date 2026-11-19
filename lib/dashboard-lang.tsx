'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { langHref, stripLang, type DashLang } from './dashboard-lang-path';

export { langHref, stripLang } from './dashboard-lang-path';
export type { DashLang } from './dashboard-lang-path';

interface DashLangValue {
  /** The dashboard's language, from the URL only: `/ar/...` is Arabic, a plain URL is English. */
  lang: DashLang;
  /** Opens the same page in the other language (the other URL). */
  setLang: (l: DashLang) => void;
  /**
   * Pick the label to display for a bilingual record, in the viewed language, falling back
   * to the other so a label is never blank. The stored value that reaches the backend is the
   * record's id — both languages already live on the row — so this only affects what the
   * editor SEES, never what is saved.
   */
  pick: (ar: string | null | undefined, en: string | null | undefined) => string;
}

const DashLangContext = React.createContext<DashLangValue | null>(null);

/** `lang` comes from the server (the proxy reads it off the URL), so the first paint is already right. */
export function DashboardLangProvider({ lang, children }: { lang: DashLang; children: React.ReactNode }) {
  // Switching language is a new URL, loaded fresh, so the whole page (layouts included) renders in it.
  const setLang = React.useCallback((next: DashLang) => {
    if (next === lang) return;
    window.location.assign(langHref(window.location.pathname, next) + window.location.search + window.location.hash);
  }, [lang]);

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

  return <DashLangContext.Provider value={value}><div lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="contents">{children}</div></DashLangContext.Provider>;
}

export function useDashboardLang(): DashLangValue {
  const ctx = React.useContext(DashLangContext);
  if (!ctx) throw new Error('useDashboardLang must be used within DashboardLangProvider');
  return ctx;
}

export function useOptionalDashboardLang(): DashLangValue | null {
  return React.useContext(DashLangContext);
}

/** The current route without the language prefix, for "which page am I on" checks. */
export function useDashPath() {
  return stripLang(usePathname() ?? '/');
}
