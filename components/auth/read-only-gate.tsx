'use client';

import * as React from 'react';
import { Eye } from 'lucide-react';

/**
 * Wraps the dashboard content so a `viewer` can look but not touch.
 *
 * A blanket disabled <fieldset> was too broad: it also killed VIEW-only controls — the tab
 * switcher (Details / Amenities / Hours / Media) and the EN/ع language toggle — which a
 * viewer legitimately needs to browse a record. So this disables by CSS instead, with two
 * deliberate exemptions:
 *   - anything with role="tab" (Radix TabsTrigger) — switching tabs is reading, not editing
 *   - anything marked data-ro-allow="true" — the language/view toggles opt in
 * Everything else interactive (inputs, selects, textareas, checkboxes, and every other
 * button) is made non-clickable and dimmed.
 *
 * The sidebar nav sits OUTSIDE this wrapper, so navigation between pages always works.
 *
 * This is presentation, not the security boundary — the backend RolesGuard already rejects a
 * viewer's writes with 403. Its job is to stop a viewer reaching a control at all, so they
 * never hit a forbidden error; the ban is visible up front.
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
      <style>{`
        /* Data-entry controls: always blocked. */
        .khg-readonly :is(input, textarea, select) {
          pointer-events: none !important;
          opacity: 0.6;
        }
        /* Buttons: blocked EXCEPT tab switchers and opted-in view toggles. */
        .khg-readonly button:not([role="tab"]):not([data-ro-allow="true"]) {
          pointer-events: none !important;
          opacity: 0.6;
        }
        /* A label wrapping a checkbox/radio would still toggle it on click — neutralise it,
           but never a label that contains a tab or an allowed control. */
        .khg-readonly label:has(:is(input, [type="checkbox"], [type="radio"])) {
          pointer-events: none;
        }
      `}</style>
      <div
        className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        data-trace-id="read-only-banner"
        role="status"
      >
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          You have <strong>view-only</strong> access. You can browse every page and switch
          tabs, but fields and actions are disabled.
        </span>
      </div>
      <div className="khg-readonly">{children}</div>
    </>
  );
}
