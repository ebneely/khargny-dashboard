// Language of the dashboard, from the URL only. This module has no client boundary so a server component can read it
// too (`run` from the server, `dash-lang-server`); the hooks and the provider stay in dashboard-lang.tsx.

export type DashLang = 'ar' | 'en';

/** Paths that have an Arabic twin under `/ar` (the proxy rewrites `/ar/...` onto them). */
const LOCALIZED = /^\/(dashboard|login)(?=$|[/?#])/;

/** The path without its language prefix (what the app's routes are named). */
export const stripLang = (path: string) => (path === '/ar' ? '/' : path.startsWith('/ar/') ? path.slice(3) : path);

/** An internal href in a language: Arabic gets the `/ar` prefix, English never has one. */
export function langHref(href: string, lang: DashLang) {
  const plain = stripLang(href);
  return lang === 'ar' && LOCALIZED.test(plain) ? `/ar${plain}` : plain;
}
