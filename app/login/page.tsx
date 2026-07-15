'use client';

import { Suspense, useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
        });
        if (!cancelled && res.ok) {
          router.replace(redirectTo);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, redirectTo]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: { code?: string; message?: string } }
        | null;

      if (!res.ok) {
        const code = body?.error?.code;
        if (code === 'NETWORK_ERROR' || res.status === 503) {
          setError('Connection error. Try again.');
        } else if (code === 'TOO_MANY_ATTEMPTS' || res.status === 429) {
          setError('Too many attempts. Try again in a few minutes.');
        } else {
          setError(body?.error?.message || 'Invalid email or password');
        }
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Connection error. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!sessionChecked) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-background p-4">
      <div
        className="w-full max-w-md rounded-(--radius-ds-lg) border border-border bg-card p-8 shadow-(--shadow-ds-sm)"
        data-trace-id="auth-login-form"
      >
        <h1 className="font-display text-xl font-semibold text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Khargny admin dashboard</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@khargny.com"
              data-trace-id="auth-login-email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              data-trace-id="auth-login-password"
            />
          </div>

          {error && (
            <div
              data-trace-id="auth-login-error"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            data-trace-id="auth-login-submit"
            className="mt-2 h-11 w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
