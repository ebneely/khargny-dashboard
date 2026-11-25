'use client';

import * as React from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ChartLine, HeartHandshake, CornerDownLeft, Inbox, Keyboard, MapPin, Megaphone, Plus, Search, Settings, Store, Sun, UserPlus, Wallet, Layers, type LucideIcon } from 'lucide-react';
import Link from '@/components/lang-link';
import { ProfileHeader } from '@/components/auth/profile-header';
import { DashboardLangToggle } from './dashboard-lang-toggle';
import { useDashboardCopy } from './dashboard-text';
import { useRouter } from '@/lib/dash-router';
import { useDashboardLang, useDashPath } from '@/lib/dashboard-lang';
import { LIBRARY_TABS, locate, matchHref, type Section, type SectionIcon } from '@/lib/dashboard-sections';
import { useInboxCounts, waitingTotal } from '@/lib/api/hooks/use-inbox-counts';
import { adminApi, toList } from '@/lib/api/admin-client';
import { placeCover } from '@/lib/place-list';
import { RecordThumbnail } from './record-cell';
import { cn } from '@/lib/utils';
import type { InboxCounts } from '@/lib/api/inbox';

const ICONS: Record<SectionIcon, LucideIcon> = { today: Sun, inbox: Inbox, places: MapPin, moods: HeartHandshake, money: Wallet, marketplace: Store, algorithm: ChartLine, settings: Settings };

/** The Inbox queues, in the order the team works them (one list for the Inbox rail, Today and ⌘K). */
export const QUEUES = [
  { id: 'corrections', count: 'corrections', label: 'Corrections', job: 'Answer corrections' },
  { id: 'reports', count: 'reports', label: 'Reports', job: 'Read reports' },
  { id: 'renewals', count: 'renewals', label: 'Renewal receipts', job: 'Check renewal receipts' },
  { id: 'photos', count: 'photos', label: 'Owner photos', job: 'Approve owner photos' },
  { id: 'owner-requests', count: 'owner_requests', label: 'Owner requests', job: 'Answer owner requests' },
  { id: 'lister-documents', count: 'lister_documents', label: 'Host papers', job: 'Check host papers' },
  { id: 'trip-reports', count: 'trip_reports', label: 'Trip reports', job: 'Read trip reports' },
  { id: 'no-hours', count: 'no_hours', label: 'Places without hours', job: 'Add missing hours' },
] as const satisfies readonly { id: string; count: keyof InboxCounts; label: string; job: string }[];

const InboxCountsContext = React.createContext<InboxCounts | null>(null);
/** The Inbox counts the top panel loaded for this page (shared, so Today and Inbox don't ask twice). */
export const useShellInboxCounts = () => React.useContext(InboxCountsContext);

/** Top panel + section tabs + ⌘K + shortcuts around every dashboard page. */
export function DashboardShell({ sections, children }: { sections: Section[]; children: React.ReactNode }) {
  const path = useDashPath();
  const counts = useInboxCounts(path);
  const [palette, setPalette] = React.useState(false);
  const [keys, setKeys] = React.useState(false);
  useShortcuts(sections, () => setPalette(true), () => setKeys(true));
  return <InboxCountsContext.Provider value={counts}>
    <TopPanel sections={sections} counts={counts} pinned={palette || keys} onFind={() => setPalette(true)} />
    <main className="mx-auto w-full max-w-[1392px] min-w-0 flex-1 px-4 pb-12 pt-[72px] sm:px-6">
      <SectionTabs sections={sections} />
      {children}
    </main>
    {palette && <Palette sections={sections} counts={counts} onClose={() => setPalette(false)} onKeys={() => { setPalette(false); setKeys(true); }} />}
    {keys && <KeysSheet sections={sections} onClose={() => setKeys(false)} />}
  </InboxCountsContext.Provider>;
}

/**
 * Hides when the page scrolls down and comes back when it scrolls up (the direction must hold
 * for 24 px, DIRECTION's one rule for bars), near the top, at the top edge, or with focus inside.
 */
function TopPanel({ sections, counts, pinned, onFind }: { sections: Section[]; counts: InboxCounts | null; pinned: boolean; onFind: () => void }) {
  const copy = useDashboardCopy();
  const router = useRouter();
  const path = useDashPath();
  // The path it was hidden on: a new page always starts with the panel shown.
  const [hiddenOn, setHiddenOn] = React.useState<string | null>(null);
  const pathRef = React.useRef(path);
  React.useEffect(() => { pathRef.current = path; }, [path]);
  const setHidden = React.useCallback((value: boolean) => setHiddenOn(value ? pathRef.current : null), []);
  const hidden = hiddenOn === path;
  const [scrolled, setScrolled] = React.useState(false);
  const [focusInside, setFocusInside] = React.useState(false);
  React.useEffect(() => {
    let last = window.scrollY; let anchor = last;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 4);
      if (y < 80) { setHidden(false); anchor = y; }
      else if ((y - last) * (last - anchor) < 0) anchor = last; // direction changed: measure from here
      if (y - anchor > 24) setHidden(true);
      if (anchor - y > 24) setHidden(false);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [setHidden]);
  const active = locate(path, sections).section?.href;
  const waiting = waitingTotal(counts);
  const show = !hidden || pinned || focusInside;
  return <>
    {/* The top edge brings the panel back for a mouse. */}
    <div aria-hidden="true" className="print-hide fixed inset-x-0 top-0 z-40 h-3" onMouseEnter={() => setHidden(false)} />
    <header data-slot="top-panel" data-hidden={!show || undefined} onFocus={() => setFocusInside(true)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocusInside(false); }}
      className={cn('print-hide fixed inset-x-0 top-0 z-50 h-14 bg-background/80 backdrop-blur-xl backdrop-saturate-150 transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none', scrolled && 'shadow-[0_1px_0_var(--border)]', !show && '-translate-y-[calc(100%+2px)]')}>
      <div className="mx-auto flex h-full max-w-[1392px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <button type="button" onClick={() => router.back()} aria-label={copy('Back')} title={copy('Back')} className="hidden size-[30px] shrink-0 place-items-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border transition-transform active:scale-95 sm:grid"><ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" /></button>
        <Link href="/dashboard" title={`${copy('Today')} (g t)`} aria-current={path === '/dashboard' ? 'page' : undefined} className="flex shrink-0 items-center gap-2 rounded-full pe-1.5 font-semibold text-foreground">
          <Image src="/khargny-logo.png" alt="" width={24} height={30} className="h-[30px] w-auto" />
          <span className={cn('hidden text-sm font-medium xl:inline', path === '/dashboard' ? 'text-foreground' : 'text-muted-foreground')}>{copy('Today')}</span>
        </Link>
        <nav aria-label={copy('Dashboard')} className="flex min-w-0 items-center gap-0.5 overflow-x-auto rounded-full bg-muted p-[3px] [scrollbar-width:none]">
          {sections.map((section) => {
            const Icon = ICONS[section.icon];
            const current = section.href === active;
            const badge = section.icon === 'inbox' && waiting > 0 ? waiting : 0;
            return <Link key={section.href} href={section.href} aria-current={current ? 'page' : undefined} title={`${copy(section.label)} (g ${section.key})`}
              className={cn('relative inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors lg:px-3', current ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(23,23,26,0.12)]' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className={cn('size-4 shrink-0', current && 'text-primary')} aria-hidden="true" />
              <span className="sr-only lg:not-sr-only">{copy(section.label)}</span>
              {badge > 0 && <span className="inline-grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1.5 text-[11px] font-semibold tabular-nums text-primary-foreground" aria-label={`${badge} ${copy('waiting')}`}>{badge}</span>}
            </Link>;
          })}
        </nav>
        <div className="flex-1" />
        <button type="button" onClick={onFind} aria-label={copy('Find a place or jump to')} aria-keyshortcuts="/ Control+K Meta+K"
          className="inline-flex h-[30px] shrink-0 items-center gap-2 rounded-full bg-card px-2.5 text-start text-[13px] text-muted-foreground shadow-sm ring-1 ring-border hover:ring-foreground/20 lg:w-64 lg:ps-3 lg:pe-1.5">
          <Search className="size-4 shrink-0" aria-hidden="true" /><span className="hidden flex-1 truncate lg:inline">{copy('Find a place or jump to')}</span><kbd className="hidden h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-card px-1 text-[10.5px] font-semibold shadow-[inset_0_0_0_1px_var(--border),0_1px_0_var(--border)] lg:inline-grid">/</kbd>
        </button>
        <DashboardLangToggle className="hidden sm:inline-flex" />
        <ProfileHeader compact />
      </div>
    </header>
  </>;
}

/** The open section's pages as underline tabs; the Library adds its own row under them. */
function SectionTabs({ sections }: { sections: Section[] }) {
  const copy = useDashboardCopy();
  const path = useDashPath();
  const params = useSearchParams();
  const { section, tab } = locate(path, sections);
  if (!section || section.tabs.length < 2) return null;
  // Numbers keeps the chosen window and filters when moving between its pages.
  const carried = new URLSearchParams();
  if (section.icon === 'algorithm') for (const key of ['window', 'from', 'to', 'platform', 'cityId', 'who']) if (params.get(key)) carried.set(key, params.get(key)!);
  const query = carried.size ? `?${carried}` : '';
  const library = path.startsWith('/dashboard/places/library');
  const libraryTab = library ? matchHref(path, LIBRARY_TABS.map((entry) => entry.href)) : undefined;
  return <div className="print-hide mb-5 space-y-3">
    <nav aria-label={copy(`${section.label} pages`)} className="flex gap-5 overflow-x-auto border-b border-border [scrollbar-width:none]">
      {section.tabs.map((entry) => <UnderlineTab key={entry.href} href={entry.href + query} current={entry === tab}>{copy(entry.label)}</UnderlineTab>)}
    </nav>
    {library && <nav aria-label={copy('Library')} className="flex w-fit max-w-full flex-wrap gap-0.5 rounded-full bg-muted p-[3px]">
      {LIBRARY_TABS.map((entry) => <Link key={entry.href} href={entry.href} aria-current={entry.href === libraryTab ? 'page' : undefined}
        className={cn('inline-flex h-7 items-center rounded-full px-3 text-[13px] font-medium whitespace-nowrap', entry.href === libraryTab ? 'bg-card text-foreground shadow-[0_1px_3px_rgba(23,23,26,0.12)]' : 'text-muted-foreground hover:text-foreground')}>{copy(entry.label)}</Link>)}
    </nav>}
  </div>;
}

function UnderlineTab({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return <Link href={href} aria-current={current ? 'page' : undefined}
    className={cn('relative inline-flex shrink-0 items-center gap-1.5 pt-2 pb-2.5 text-sm font-medium whitespace-nowrap', current ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary' : 'text-muted-foreground hover:text-foreground')}>{children}</Link>;
}

/* ---------- ⌘K: places, pages and jobs ---------- */

/** Arabic and English folded the same way (alef forms, taa marbuta, alef maqsura, diacritics). */
const fold = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[ً-ٰٟ]/g, '').replace(/[أإآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();

type Jump = { label: string; href: string; group: 'Jobs' | 'Pages' | 'Places'; icon: LucideIcon; hint?: string; sub?: string; thumb?: string | null; count?: number };

function useJumps(sections: Section[], counts: InboxCounts | null): Jump[] {
  return React.useMemo(() => {
    const jobs: Jump[] = [
      { label: 'Start with the oldest', href: '/dashboard/inbox?run=1', group: 'Jobs', icon: CornerDownLeft },
      ...QUEUES.map((queue) => ({ label: queue.job, href: `/dashboard/inbox?queue=${queue.id}`, group: 'Jobs' as const, icon: Inbox, count: counts?.[queue.count] })),
      { label: 'Sell an ad', href: '/dashboard/money/ads/new', group: 'Jobs', icon: Megaphone },
      { label: 'Add a place', href: '/dashboard/places/new', group: 'Jobs', icon: Plus },
      { label: 'New owner', href: '/dashboard/money/owners/new', group: 'Jobs', icon: UserPlus },
      { label: 'Make a collection', href: '/dashboard/places/library/collections', group: 'Jobs', icon: Layers },
    ];
    const pages: Jump[] = [{ label: 'Today', href: '/dashboard', group: 'Pages', icon: Sun, hint: 'g t' }];
    for (const section of sections) {
      pages.push({ label: section.label, href: section.href, group: 'Pages', icon: ICONS[section.icon], hint: `g ${section.key}` });
      for (const tab of section.tabs) if (tab.href !== section.href) pages.push({ label: `${section.label}: ${tab.label}`, href: tab.href, group: 'Pages', icon: ICONS[section.icon] });
    }
    for (const tab of LIBRARY_TABS) pages.push({ label: `Library: ${tab.label}`, href: tab.href, group: 'Pages', icon: MapPin });
    return [...jobs, ...pages];
  }, [sections, counts]);
}

function Palette({ sections, counts, onClose, onKeys }: { sections: Section[]; counts: InboxCounts | null; onClose: () => void; onKeys: () => void }) {
  const copy = useDashboardCopy();
  const { pick } = useDashboardLang();
  const router = useRouter();
  const jumps = useJumps(sections, counts);
  const [query, setQuery] = React.useState('');
  const [index, setIndex] = React.useState(0);
  const [places, setPlaces] = React.useState<Jump[]>([]);
  const input = React.useRef<HTMLInputElement>(null);
  const returnFocus = React.useRef<Element | null>(null);
  React.useEffect(() => { returnFocus.current = document.activeElement; input.current?.focus(); return () => { (returnFocus.current as HTMLElement | null)?.focus?.(); }; }, []);
  // Places come from the server's own search (both languages), a short pause after typing.
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let live = true;
    const timer = window.setTimeout(() => {
      adminApi.get<unknown>('/v1/admin/places', { search: q, limit: 6, skip: 0 })
        .then((res) => { if (live) setPlaces(toList<{ id: string; name: string; nameEn?: string | null; city?: { name?: string; nameEn?: string | null } | null; region?: string | null }>(res).items.map((place) => ({ label: pick(place.name, place.nameEn), href: `/dashboard/places/${place.id}`, group: 'Places' as const, icon: MapPin, sub: [place.region, place.city ? pick(place.city.name ?? '', place.city.nameEn) : ''].filter(Boolean).join(', '), thumb: placeCover(place as never) }))); })
        .catch(() => { if (live) setPlaces([]); });
    }, 160);
    return () => { live = false; window.clearTimeout(timer); };
  }, [query, pick]);
  const q = fold(query);
  const matches = q ? jumps.filter((jump) => fold(jump.label).includes(q) || fold(copy(jump.label)).includes(q)) : jumps.filter((jump) => jump.group === 'Jobs').slice(0, 9).concat(jumps.filter((jump) => jump.group === 'Pages').slice(0, 7));
  const results = [...(query.trim().length < 2 ? [] : places), ...matches];
  const chosen = Math.min(index, Math.max(0, results.length - 1));
  const open = (jump?: Jump) => { if (!jump) return; onClose(); router.push(jump.href); };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setIndex((chosen + 1) % Math.max(1, results.length)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setIndex((chosen - 1 + results.length) % Math.max(1, results.length)); }
    else if (event.key === 'Enter') { event.preventDefault(); open(results[chosen]); }
    else if (event.key === '?' && !query) { event.preventDefault(); onKeys(); }
  };
  let group = '';
  return <div className="fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
    <div className="absolute inset-0 bg-foreground/15 animate-in fade-in-0 duration-150" onClick={onClose} aria-hidden="true" />
    <div role="dialog" aria-modal="true" aria-label={copy('Find a place or jump to')} className="absolute start-1/2 top-[12vh] w-[min(600px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-2xl bg-card shadow-[0_18px_50px_rgba(23,23,26,0.18),0_2px_6px_rgba(23,23,26,0.08)] animate-in fade-in-0 zoom-in-[0.98] duration-150 rtl:translate-x-1/2">
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input ref={input} value={query} onChange={(event) => { setQuery(event.target.value); setIndex(0); }} placeholder={copy('Find a place, a page or a job')} autoComplete="off" spellCheck={false}
          role="combobox" aria-expanded="true" aria-controls="palette-results" aria-activedescendant={results.length ? `palette-${chosen}` : undefined} className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" />
        <kbd className="rounded-[5px] px-1.5 text-[10.5px] font-semibold text-muted-foreground shadow-[inset_0_0_0_1px_var(--border)]">Esc</kbd>
      </div>
      <ul id="palette-results" role="listbox" aria-label={copy('Results')} className="max-h-[min(60vh,440px)] overflow-y-auto p-1.5">
        {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{query.trim().length < 2 ? copy('Type a place name, a page or a job.') : copy('Nothing matches. Try the place name in Arabic or English.')}</li>}
        {results.map((jump, at) => {
          const heading = jump.group !== group ? (group = jump.group) : '';
          const Icon = jump.icon;
          return <React.Fragment key={`${jump.group}-${jump.href}-${at}`}>
            {heading && <li role="presentation" className="px-2.5 pt-2 pb-1 text-xs font-medium text-muted-foreground">{copy(heading)}</li>}
            <li id={`palette-${at}`} role="option" aria-selected={at === chosen} onMouseMove={() => setIndex(at)} onClick={() => open(jump)}
              className={cn('flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm', at === chosen && 'bg-muted')}>
              {jump.group === 'Places' ? <RecordThumbnail src={jump.thumb ?? null} size={40} /> : <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-primary"><Icon className="size-4" aria-hidden="true" /></span>}
              <span className="min-w-0 flex-1"><span dir="auto" className="block truncate font-medium text-foreground">{jump.group === 'Places' ? jump.label : copy(jump.label)}</span>{jump.sub && <span dir="auto" className="block truncate text-xs text-muted-foreground">{jump.sub}</span>}</span>
              {jump.count ? <span className="tabular-nums text-sm font-semibold text-foreground">{jump.count}</span> : null}
              {jump.hint && <span className="text-xs text-muted-foreground" dir="ltr">{jump.hint}</span>}
            </li>
          </React.Fragment>;
        })}
      </ul>
      <div className="flex gap-4 border-t border-border px-4 py-2 text-xs text-muted-foreground"><span dir="ltr">↑ ↓</span><span>{copy('Enter opens')}</span><button type="button" className="ms-auto inline-flex items-center gap-1 hover:text-foreground" onClick={onKeys}><Keyboard className="size-3.5" aria-hidden="true" />{copy('All shortcuts')} <span dir="ltr">?</span></button></div>
    </div>
  </div>;
}

/* ---------- Shortcuts: / and ⌘K find, g then a letter goes, ? lists them ---------- */

const typing = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

function useShortcuts(sections: Section[], find: () => void, keys: () => void) {
  const router = useRouter();
  React.useEffect(() => {
    let g = 0;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); find(); return; }
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || typing(event.target) || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (event.key === '/') { event.preventDefault(); find(); return; }
      if (event.key === '?') { event.preventDefault(); keys(); return; }
      if (event.key === 'g') { g = Date.now(); return; }
      if (g && Date.now() - g < 1200) {
        g = 0;
        const to = event.key === 't' ? '/dashboard' : event.key === 'l' ? '/dashboard/places/library/cities' : sections.find((section) => section.key === event.key)?.href;
        if (to) { event.preventDefault(); router.push(to); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sections, find, keys, router]);
}

function KeysSheet({ sections, onClose }: { sections: Section[]; onClose: () => void }) {
  const copy = useDashboardCopy();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { ref.current?.focus(); }, []);
  const rows: [string, string][] = [
    ['/', 'Find a place or jump to'], ['Ctrl K', 'Find a place or jump to'], ['g t', 'Today'],
    ...sections.map((section): [string, string] => [`g ${section.key}`, section.label]), ['g l', 'Library'],
    ['A', 'Inbox: apply or approve'], ['R', 'Inbox: reject'], ['J  K', 'Inbox: next, previous'], ['?', 'All shortcuts'], ['Esc', 'Close'],
  ];
  return <div className="fixed inset-0 z-[60]" onKeyDown={(event) => { if (event.key === 'Escape' || event.key === '?') { event.preventDefault(); onClose(); } }}>
    <div className="absolute inset-0 bg-foreground/15" onClick={onClose} aria-hidden="true" />
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={copy('Keyboard shortcuts')} className="absolute start-1/2 top-[12vh] w-[min(440px,calc(100vw-24px))] -translate-x-1/2 rounded-2xl bg-card p-5 shadow-[0_18px_50px_rgba(23,23,26,0.18)] outline-none rtl:translate-x-1/2">
      <h2 className="mb-3 text-base font-semibold">{copy('Keyboard shortcuts')}</h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">{rows.map(([key, what]) => <React.Fragment key={key + what}><dt dir="ltr" className="font-mono text-xs leading-5 text-muted-foreground">{key}</dt><dd>{copy(what)}</dd></React.Fragment>)}</dl>
    </div>
  </div>;
}
