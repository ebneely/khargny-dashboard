'use client';

import * as React from 'react';
import { Eye } from 'lucide-react';

/**
 * Wraps the dashboard content so a `viewer` can look but not touch.
 *
 * The mechanism is a disabled <fieldset>: per HTML, a disabled fieldset disables every
 * descendant form control — input, textarea, select, button — with no per-component wiring,
 * so a new form added tomorrow is covered automatically. `display: contents` keeps it from
 * affecting layout. The sidebar nav lives OUTSIDE this wrapper, so navigation stays live:
 * a viewer can move between pages and read them, and nothing else.
 *
 * This is presentation and a courtesy, not the security boundary — the backend RolesGuard
 * already rejects a viewer's writes with 403. Its job is to stop a viewer from hitting a
 * disabled-anyway button and eating a forbidden error; the ban is visible up front.
 *
 * Links styled as buttons are still clickable (they are <a>, not form controls); that's fine,
 * navigation is allowed. Actual write actions are all real <button>s.
 */
export function ReadOnlyGate({
  readOnly,
  children,
}: {
  readOnly: boolean;
  children: React.ReactNode;
}) {
  if (!readOnly) return <>{children}</>;

  return (
    <>
      <div
        className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        data-trace-id="read-only-banner"
        role="status"
      >
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          You have <strong>view-only</strong> access. Fields and actions are disabled; you can
          browse every page but not make changes.
        </span>
      </div>
      {/* display:contents so the fieldset doesn't alter layout; disabled still cascades. */}
      <fieldset disabled className="contents" aria-label="Read-only content">
        {children}
      </fieldset>
    </>
  );
}
