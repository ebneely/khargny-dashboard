import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { langHref, type DashLang } from '@/lib/dashboard-lang-path';

/** The request's language, set by the proxy from the URL (/ar/... = Arabic, plain = English). */
export async function serverLang(): Promise<DashLang> {
  return (await headers()).get('x-dash-lang') === 'ar' ? 'ar' : 'en';
}

/** redirect() that stays in the request's language. */
export async function dashRedirect(path: string): Promise<never> {
  redirect(langHref(path, await serverLang()));
}
