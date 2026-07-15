import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/config';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24,
};

interface LoginBody {
  email: string;
  password: string;
}

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

export async function POST(request: NextRequest) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_BODY', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { success: false, error: { code: 'MISSING_CREDENTIALS', message: 'Email and password required' } },
      { status: 400 },
    );
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'NETWORK_ERROR', message: 'Connection error. Try again.' } },
      { status: 503 },
    );
  }

  let payload: TokenPairBody | null = null;
  try {
    payload = (await backendRes.json()) as TokenPairBody;
  } catch {
    payload = null;
  }

  if (!backendRes.ok || !payload?.data) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: payload?.error?.code || 'INVALID_CREDENTIALS',
          message: payload?.error?.message || 'Invalid email or password',
        },
      },
      { status: backendRes.status },
    );
  }

  const { access_token, refresh_token } = payload.data;
  const response = NextResponse.json({
    success: true,
    data: payload.data,
  });
  response.cookies.set('session_token', access_token, COOKIE_OPTS);
  response.cookies.set('refresh_token', refresh_token, COOKIE_OPTS);
  response.cookies.set('token', access_token, { ...COOKIE_OPTS, httpOnly: false });
  return response;
}
