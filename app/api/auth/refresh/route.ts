import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_BASE_URL } from '@/lib/config';

interface TokenPairBody {
  success?: boolean;
  data?: {
    access_token: string;
    refresh_token: string;
    expires_in?: string;
    token_type?: string;
  };
  error?: { code?: string; message?: string };
}

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

  if (!refreshToken) {
    const response = NextResponse.json(
      { success: false, error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token in cookies' } },
      { status: 401 },
    );
    clearBothCookies(response);
    return response;
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    const response = NextResponse.json(
      { success: false, error: { code: 'NETWORK_ERROR', message: 'Backend unreachable' } },
      { status: 503 },
    );
    return response;
  }

  let body: TokenPairBody | null = null;
  try {
    body = (await backendRes.json()) as TokenPairBody;
  } catch {
    body = null;
  }

  if (!backendRes.ok || !body?.data) {
    const response = NextResponse.json(
      {
        success: false,
        error: {
          code: body?.error?.code || 'REFRESH_FAILED',
          message: body?.error?.message || 'Refresh failed',
        },
      },
      { status: backendRes.status },
    );
    clearBothCookies(response);
    return response;
  }

  const { access_token, refresh_token } = body.data;
  const response = NextResponse.json({
    success: true,
    data: body.data,
  });
  response.cookies.set('session_token', access_token, COOKIE_OPTS);
  response.cookies.set('refresh_token', refresh_token, COOKIE_OPTS);
  response.cookies.set('token', access_token, { ...COOKIE_OPTS, httpOnly: false });
  return response;
}
