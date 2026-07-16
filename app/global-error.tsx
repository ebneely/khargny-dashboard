'use client';

// Last-resort boundary: catches errors thrown in the ROOT layout itself, where
// app/error.tsx cannot reach. It replaces the entire document, so it renders
// its own <html>/<body> and uses inline styles (global CSS may not have loaded
// if the root failed). Everything below the root is covered by app/error.tsx
// and app/dashboard/error.tsx instead.
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global] render error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#faf9f7',
          color: '#1c1a17',
          textAlign: 'center',
          padding: '1rem',
        }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ marginTop: '0.5rem', maxWidth: '28rem', color: '#6b665e' }}>
          The app hit an unexpected error. Please reload.
        </p>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={reset}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '20px',
              border: 'none',
              background: '#e8622a',
              color: '#fff',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '20px',
              border: '1px solid #d6d2ca',
              background: 'transparent',
              color: '#1c1a17',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
