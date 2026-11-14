import { NextRequest, NextResponse } from 'next/server';

// Routes that don't require auth (always public).
const PUBLIC_PREFIXES = ['/login', '/api/auth/login', '/api/auth/refresh'];

// Routes that should never run the proxy logic (static + Next internals).
function isExcluded(pathname: string): boolean {
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/api/auth/logout')) return true; // logout must always work
  if (pathname === '/favicon.ico' || pathname === '/robots.txt') return true;
  if (/\.(png|jpe?g|gif|svg|ico|css|js|map|woff2?)$/i.test(pathname)) return true;
  return false;
}

function isProtected(pathname: string): boolean {
  // All dashboard routes are protected. Login is the only public page.
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

function isPublicLogin(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function proxy(request: NextRequest) {
  // Language comes from the URL only (owner 2026-11-14): /ar/... is Arabic, a plain URL is English.
  // /ar/... is served by the plain route; the x-dash-lang header tells the layouts which language.
  const arabic = request.nextUrl.pathname === '/ar' || request.nextUrl.pathname.startsWith('/ar/');
  const pathname = arabic ? request.nextUrl.pathname.slice(3) || '/' : request.nextUrl.pathname;
  const { search } = request.nextUrl;
  const prefix = arabic ? '/ar' : '';

  if (isExcluded(pathname)) {
    return arabic ? NextResponse.rewrite(new URL(pathname + search, request.url)) : NextResponse.next();
  }

  // Dev mode auto-login (process.env.NODE_ENV !== 'production'): the session
  // API at /api/auth/session returns a hardcoded dev super-admin when no
  // cookie is set. The proxy mirrors that — in dev, no cookie still counts
  // as authenticated. In production, cookie presence is required.
  const isDev = process.env.NODE_ENV !== 'production';
  const hasSession = Boolean(request.cookies.get('session_token')?.value);
  const isAuthed = hasSession || isDev;

  // Authenticated user hitting /login → bounce to /dashboard.
  if (isAuthed && isPublicLogin(pathname)) {
    const dest = request.nextUrl.searchParams.get('redirect') || prefix + '/dashboard';
    const safe = dest.startsWith('/') && !dest.startsWith('//') ? dest : prefix + '/dashboard';
    return NextResponse.redirect(new URL(safe, request.url));
  }

  // Unauthenticated user hitting /dashboard/* → bounce to /login with redirect param.
  if (!isAuthed && isProtected(pathname)) {
    const loginUrl = new URL(prefix + '/login', request.url);
    if (pathname !== '/dashboard') {
      loginUrl.searchParams.set('redirect', prefix + pathname + (search || ''));
    }
    return NextResponse.redirect(loginUrl);
  }

  // Always set here (never trust a header the browser sent): a plain URL is English.
  const headers = new Headers(request.headers);
  headers.set('x-dash-lang', arabic ? 'ar' : 'en');
  return arabic
    ? NextResponse.rewrite(new URL(pathname + search, request.url), { request: { headers } })
    : NextResponse.next({ request: { headers } });
}

export const config = {
  // Run on every route except static + Next internals. The function above
  // also short-circuits on additional paths (logout API, favicon, etc).
  matcher: ['/((?!_next/static|_next/image).*)'],
};
