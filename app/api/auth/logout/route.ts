import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_BASE_URL } from '@/lib/config';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24,
};

function clearBothCookies(response: NextResponse) {
  response.cookies.set('session_token', '', { ...COOKIE_OPTS, maxAge: 0 });
  response.cookies.set('refresh_token', '', { ...COOKIE_OPTS, maxAge: 0 });
  response.cookies.set('token', '', { ...COOKIE_OPTS, maxAge: 0, httpOnly: false });
}

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken =
    cookieStore.get('refresh_token')?.value ||
    cookieStore.get('session_token')?.value ||
    cookieStore.get('token')?.value;

  if (refreshToken) {
    try {
      await fetch(`${API_BASE_URL}/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Defensive: always clear cookies, even if the backend is unreachable.
    }
  }

  const response = NextResponse.json({ success: true });
  clearBothCookies(response);
  return response;
}
