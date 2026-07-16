'use client';

// Top-level error boundary for routes outside /dashboard (e.g. /login, /).
// Catches any render error so the user sees a recoverable fallback instead of
// Next's bare "This page couldn't load" screen. /dashboard has its own
// error.tsx that keeps the sidebar mounted.
import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app] render error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-muted-foreground" />
      <h1 className="font-display text-xl font-semibold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page hit an unexpected error. Try again, or reload.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={reset} className="gap-2">
          <RotateCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
      {error?.digest && (
        <p className="mt-4 text-xs text-muted-foreground/70">Ref: {error.digest}</p>
      )}
    </div>
  );
}
