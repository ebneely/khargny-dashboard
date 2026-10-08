'use client';

import * as React from 'react';
import { Eye } from 'lucide-react';
import { usePathname } from 'next/navigation';

const ReadOnlyContext = React.createContext(false);

export function useDashboardReadOnly() {
  return React.useContext(ReadOnlyContext);
}

const BLOCKED_CONTROLS = ':is(input, textarea, select, button):not([role="tab"]):not([data-ro-allow="true"])';

/**
 * Wraps the dashboard content so a `viewer` can look but not touch.
 *
 * A blanket disabled <fieldset> was too broad: it also killed VIEW-only controls — the tab
 * switcher (Details / Amenities / Hours / Media) and the EN/ع language toggle — which a
 * viewer legitimately needs to browse a record. So this makes individual controls inert, with two
 * deliberate exemptions:
 *   - anything with role="tab" (Radix TabsTrigger) — switching tabs is reading, not editing
 *   - anything marked data-ro-allow="true" — the language/view toggles opt in
 * Data-entry controls and every other button are unfocusable, non-interactive and dimmed.
 * Controls added after loading or switching tabs are covered too.
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
  const pathname = usePathname();
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const content = contentRef.current;
    if (!readOnly || pathname === '/dashboard/settings/api-keys' || !content) return;

    const managed = new Set<HTMLElement>();
    const updateControls = () => {
      for (const control of managed) {
        if (!content.contains(control) || !control.matches(BLOCKED_CONTROLS)) {
          control.inert = false;
          managed.delete(control);
        }
      }
      for (const control of content.querySelectorAll<HTMLElement>(BLOCKED_CONTROLS)) {
        if (!control.inert) {
          control.inert = true;
          managed.add(control);
        }
      }
    };

    updateControls();
    const observer = new MutationObserver(updateControls);
    observer.observe(content, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'data-ro-allow'],
    });
    return () => {
      observer.disconnect();
      for (const control of managed) control.inert = false;
    };
  }, [readOnly, pathname]);

  if (!readOnly || pathname === '/dashboard/settings/api-keys') return <ReadOnlyContext.Provider value={false}>{children}</ReadOnlyContext.Provider>;

  return (
    <ReadOnlyContext.Provider value={readOnly}>
      <style>{`
        /* Controls: blocked EXCEPT tab switchers and opted-in view controls. */
        .khg-readonly ${BLOCKED_CONTROLS} {
          pointer-events: none !important;
          opacity: 0.6;
        }
        /* A label wrapping a checkbox/radio would still toggle it on click — neutralise it,
           but never a label that contains a tab or an allowed control. */
        .khg-readonly label:has(${BLOCKED_CONTROLS}) {
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
      <div ref={contentRef} className="khg-readonly">{children}</div>
    </ReadOnlyContext.Provider>
  );
}
