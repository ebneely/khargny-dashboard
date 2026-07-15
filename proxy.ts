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
  const { pathname, search } = request.nextUrl;

  if (isExcluded(pathname)) {
    return NextResponse.next();
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
    const dest = request.nextUrl.searchParams.get('redirect') || '/dashboard';
    const safe = dest.startsWith('/') && !dest.startsWith('//') ? dest : '/dashboard';
    return NextResponse.redirect(new URL(safe, request.url));
  }

  // Unauthenticated user hitting /dashboard/* → bounce to /login with redirect param.
  if (!isAuthed && isProtected(pathname)) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/dashboard') {
      loginUrl.searchParams.set('redirect', pathname + (search || ''));
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except static + Next internals. The function above
  // also short-circuits on additional paths (logout API, favicon, etc).
  matcher: ['/((?!_next/static|_next/image).*)'],
};
