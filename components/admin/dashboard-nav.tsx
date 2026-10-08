'use client';

import { useDashboardCopy } from '@/components/admin/dashboard-text';

import { Button } from '@/components/ui/button';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { activeNavHref } from '@/lib/dashboard-navigation';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { animate, stagger } from 'animejs';
import {
  Menu,
  X,
  LayoutDashboard,
  Store,
  Megaphone,
  MapPin,
  Building2,
  Shapes,
  Sparkles,
  Tags,
  Users,
  ContactRound,
  Settings,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icons live here, keyed by name, NOT passed in from the layout.
 *
 * The layout is a Server Component and this is a Client Component. A lucide icon is a
 * function, and functions are not serializable across the server→client boundary — passing
 * one as a prop throws "An error occurred in the Server Components render" and takes the
 * whole dashboard down. So the layout hands over a plain string `iconName` and the mapping
 * to an actual component happens here, on the client.
 */
const ICONS = {
  home: LayoutDashboard,
  storefront: Store,
  ads: Megaphone,
  places: MapPin,
  cities: Building2,
  categories: Shapes,
  amenities: Sparkles,
  tags: Tags,
  admins: Users,
  subscribers: ContactRound,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof ICONS;

export type NavItem = { href: string; label: string; iconName: NavIconName; group?: 'sales' | 'content' | 'team' };

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
  const controlCopy = useDashboardCopy();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const activeHref = activeNavHref(pathname, items);
  const { lang } = useDashboardLang();

  React.useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
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
      <nav dir={lang === 'ar' ? 'rtl' : 'ltr'} className="hidden flex-col gap-1 lg:flex" aria-label={controlCopy("Dashboard")}>
        <NavGroups items={items} activeHref={activeHref} />
      </nav>

      {/* Mobile trigger */}
      <Button variant="ghost"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="dashboard-nav-panel"
        aria-label={lang === 'ar' ? open ? 'إغلاق التنقل' : 'فتح التنقل' : open ? 'Close navigation' : 'Open navigation'}
        className="inline-flex size-11 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-accent lg:hidden"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </Button>

      {/* Mobile panel */}
      <div
        id="dashboard-nav-panel"
        ref={panelRef}
        className="absolute inset-x-2 top-full z-40 mt-1 hidden rounded-xl border border-border bg-card p-2 shadow-lg max-h-[calc(100dvh-4rem)] overflow-y-auto lg:!hidden"
        style={{ display: 'none', willChange: 'transform, opacity' }}
      >
        <nav dir={lang === 'ar' ? 'rtl' : 'ltr'} className="flex flex-col gap-1" aria-label={controlCopy("Dashboard")}>
          <NavGroups items={items} activeHref={activeHref} mobile onNavigate={() => setOpen(false)} />
        </nav>
      </div>
    </>
  );
}

const NAV_AR: Record<NavIconName, string> = {
  home: 'الرئيسية', subscribers: 'المشتركون', ads: 'الإعلانات', storefront: 'واجهة الموقع',
  places: 'الأماكن', cities: 'المدن', categories: 'التصنيفات', amenities: 'المرافق', tags: 'الوسوم',
  admins: 'المسؤولون', settings: 'الإعدادات',
};

function NavGroups({ items, activeHref, mobile, onNavigate }: { items: NavItem[]; activeHref?: string; mobile?: boolean; onNavigate?: () => void }) {
  const { lang } = useDashboardLang();
  return <>{([undefined, 'sales', 'content', 'team'] as const).map((group) => {
    const members = items.filter((item) => item.group === group);
    if (!members.length) return null;
    const heading = group && { sales: ['Sales', 'المبيعات'], content: ['Content', 'المحتوى'], team: ['Team', 'الفريق'] }[group][lang === 'ar' ? 1 : 0];
    return <div key={group ?? 'home'} className="space-y-1">{heading && <h2 className="px-3 pb-1 pt-4 text-xs font-medium text-muted-foreground">{heading}</h2>}{members.map((item) => <NavLink key={item.href} item={item} active={item.href === activeHref} mobile={mobile} onNavigate={onNavigate} />)}</div>;
  })}</>;
}

function NavLink({
  item,
  active,
  mobile,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.iconName];
  const { lang } = useDashboardLang();
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      data-nav-item={mobile ? '' : undefined}
      onClick={onNavigate}
      className={[
        // 44px min height on mobile: a nav row is a primary tap target.
        'relative flex items-center gap-2.5 rounded-md px-3 text-sm font-medium transition-colors',
        mobile ? 'min-h-11 py-2' : 'py-2',
        active
          ? 'bg-brand-50 text-brand-700'
          : 'text-secondary-foreground hover:bg-muted hover:text-foreground',
      ].join(' ')}
    >
      {active && <span aria-hidden="true" className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-brand-700" />}
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {lang === 'ar' ? NAV_AR[item.iconName] : item.label}
    </Link>
  );
}
