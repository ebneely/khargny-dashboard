'use client';

// Route-segment error boundary for the whole /dashboard subtree. Any render
// error in a dashboard page (a bad API shape, an undefined field, etc.) is
// caught here instead of bubbling to Next's bare "This page couldn't load"
// screen. The dashboard layout (sidebar + profile) stays mounted — only the
// main content area shows this fallback, and Try again re-renders the segment.
import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the real error in the browser console for debugging — the
    // fallback UI stays generic for the user.
    console.error('[dashboard] render error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="mb-4 h-10 w-10 text-muted-foreground" />
      <h1 className="font-display text-xl font-semibold text-foreground">
        Something went wrong on this page
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page hit an unexpected error. You can try again, or head back to the
        dashboard.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={reset} className="gap-2">
          <RotateCw className="h-4 w-4" />
          Try again
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
          Back to dashboard
        </Button>
      </div>
      {error?.digest && (
        <p className="mt-4 text-xs text-muted-foreground/70">Ref: {error.digest}</p>
      )}
    </div>
  );
}
