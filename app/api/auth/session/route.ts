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

interface AdminProfile {
  id: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MeBody {
  success?: boolean;
  data?: AdminProfile;
  error?: { code?: string; message?: string };
}

function parseExpiresIn(value: string | undefined): string | null {
  if (!value) return null;
  const m = value.match(/^(\d+)\s*([smhd])$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  const seconds =
    unit === 's' ? n : unit === 'm' ? n * 60 : unit === 'h' ? n * 3600 : n * 86400;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function clearBothCookies(response: NextResponse) {
  response.cookies.set('session_token', '', { ...COOKIE_OPTS, maxAge: 0 });
  response.cookies.set('refresh_token', '', { ...COOKIE_OPTS, maxAge: 0 });
  response.cookies.set('token', '', { ...COOKIE_OPTS, maxAge: 0, httpOnly: false });
}

export async function GET() {
  const cookieStore = await cookies();
  const bearer =
    cookieStore.get('session_token')?.value || cookieStore.get('token')?.value;

  if (!bearer) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TOKEN', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_BASE_URL}/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'NETWORK_ERROR', message: 'Backend unreachable' } },
      { status: 503 },
    );
  }

  let body: MeBody | null = null;
  try {
    body = (await backendRes.json()) as MeBody;
  } catch {
    body = null;
  }

  if (!backendRes.ok || !body?.data) {
    const response = NextResponse.json(
      {
        success: false,
        error: {
          code: body?.error?.code || 'UNAUTHORIZED',
          message: body?.error?.message || 'Session invalid',
        },
      },
      { status: backendRes.status },
    );
    if (backendRes.status === 401) clearBothCookies(response);
    return response;
  }

  const profile = body.data;
  const expiresAt =
    parseExpiresIn(process.env.JWT_EXPIRES_IN) || parseExpiresIn('1h');

  return NextResponse.json({
    success: true,
    data: {
      user: profile,
      session: { id: profile.id, expiresAt },
    },
  });
}
