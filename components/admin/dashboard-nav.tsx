'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { animate, stagger } from 'animejs';
import { Menu, X, type LucideIcon } from 'lucide-react';

export type NavItem = { href: string; label: string; icon: LucideIcon };

/**
 * Dashboard navigation.
 *
 * Two presentations of one list:
 *   - ≥1024px: the permanent sidebar rail
 *   - <1024px: a top bar with a menu button that opens an anime.js pill-expanding panel,
 *     the same easeOutExpo curve and stagger as the visitor site's nav, so the two
 *     properties feel like one product
 *
 * The sidebar was previously a fixed `w-60` aside with no mobile treatment at all: on a
 * phone it ate a third of the viewport and could not be dismissed.
 *
 * The active item is marked from the real pathname (`aria-current="page"`), not by color
 * alone — nested routes like /dashboard/places/123 still light up Places, and /dashboard
 * matches only exactly so Home does not stay lit on every page.
 */
export function DashboardNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  // Close on route change: tapping a link inside the panel should not leave it open over
  // the page it just navigated to.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Respect the OS setting: reduced motion gets an instant show/hide, not a slower
    // version of the same animation.
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (open) {
      panel.style.display = 'block';
      if (reduced) {
        panel.style.opacity = '1';
        panel.style.transform = 'none';
        return;
      }
      animate(panel, {
        opacity: [0, 1],
        translateY: [-10, 0],
        scaleY: [0.82, 1],
        transformOrigin: 'top',
        duration: 440,
        ease: 'outExpo',
      });
      animate(panel.querySelectorAll('[data-nav-item]'), {
        opacity: [0, 1],
        translateX: [-12, 0],
        delay: stagger(45, { start: 80 }),
        duration: 360,
        ease: 'outQuint',
      });
    } else {
      if (reduced) {
        panel.style.display = 'none';
        return;
      }
      animate(panel, {
        opacity: [1, 0],
        translateY: [0, -8],
        duration: 200,
        ease: 'outQuad',
        onComplete: () => {
          if (panelRef.current) panelRef.current.style.display = 'none';
        },
      });
    }
  }, [open]);

  // Escape closes, matching every other dismissible surface in the product.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Desktop rail */}
      <nav className="hidden flex-col gap-1 lg:flex" aria-label="Dashboard">
        {items.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="dashboard-nav-panel"
        aria-label={open ? 'Close menu' : 'Open menu'}
        className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-accent lg:hidden"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>

      {/* Mobile panel */}
      <div
        id="dashboard-nav-panel"
        ref={panelRef}
        className="absolute inset-x-2 top-full z-40 mt-1 hidden rounded-xl border border-border bg-card p-2 shadow-lg lg:!hidden"
        style={{ display: 'none', willChange: 'transform, opacity' }}
      >
        <nav className="flex flex-col gap-1" aria-label="Dashboard">
          {items.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} mobile />
          ))}
        </nav>
      </div>
    </>
  );
}

function NavLink({
  item,
  active,
  mobile,
}: {
  item: NavItem;
  active: boolean;
  mobile?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      data-nav-item={mobile ? '' : undefined}
      className={[
        // 44px min height on mobile: a nav row is a primary tap target.
        'flex items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors',
        mobile ? 'min-h-11 py-2' : 'py-2',
        active
          ? 'bg-brand-50 text-brand-700'
          : 'text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
      ].join(' ')}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}
