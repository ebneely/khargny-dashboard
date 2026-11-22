/**
 * The dashboard's places, once: the top panel, each section's tabs, the ⌘K palette and the
 * g-shortcuts all read this list (DIRECTION section 1 + the 2026-11-13 decision: Inbox, Places,
 * Money, Marketplace, Numbers, with Settings). Labels are English; the copy dictionary turns them
 * Arabic on /ar pages. `superAdminOnly` tabs are dropped on the server before they reach the page.
 */
export type SectionIcon = 'today' | 'inbox' | 'places' | 'money' | 'marketplace' | 'algorithm' | 'settings';
export interface SectionTab { href: string; label: string; superAdminOnly?: boolean; also?: string[] }
export interface Section { href: string; label: string; icon: SectionIcon; key: string; tabs: SectionTab[] }

export const SECTIONS: Section[] = [
  { href: '/dashboard/inbox', label: 'Inbox', icon: 'inbox', key: 'i', tabs: [] },
  { href: '/dashboard/places', label: 'Places', icon: 'places', key: 'p', tabs: [
    { href: '/dashboard/places', label: 'Places' },
    { href: '/dashboard/places/submissions', label: 'Submissions' },
    { href: '/dashboard/places/library/cities', label: 'Library', also: ['/dashboard/places/library'] },
  ] },
  { href: '/dashboard/money/owners', label: 'Money', icon: 'money', key: 'm', tabs: [
    { href: '/dashboard/money/owners', label: 'Owners' },
    { href: '/dashboard/money/ads', label: 'Ads' },
    { href: '/dashboard/money/plans', label: 'Plans and prices' },
  ] },
  { href: '/dashboard/marketplace', label: 'Marketplace', icon: 'marketplace', key: 'k', tabs: [] },
  { href: '/dashboard/algorithm/today', label: 'Algorithm', icon: 'algorithm', key: 'a', tabs: [
    { href: '/dashboard/algorithm/today', label: 'Today' },
    { href: '/dashboard/algorithm/people', label: 'People' },
    { href: '/dashboard/algorithm/places', label: 'Places' },
    { href: '/dashboard/algorithm/demand', label: 'Demand' },
    { href: '/dashboard/algorithm/money', label: 'Money' },
    { href: '/dashboard/algorithm/movement', label: 'Movement' },
    { href: '/dashboard/algorithm/health', label: 'Health' },
  ] },
  { href: '/dashboard/settings', label: 'Settings', icon: 'settings', key: 's', tabs: [
    { href: '/dashboard/settings', label: 'General' },
    { href: '/dashboard/settings/team', label: 'Team', superAdminOnly: true },
    { href: '/dashboard/settings/website', label: 'Website' },
    { href: '/dashboard/settings/api-keys', label: 'Connection keys' },
    { href: '/dashboard/settings/audit-log', label: 'Audit log', superAdminOnly: true },
    { href: '/dashboard/settings/media-health', label: 'Media health' },
    { href: '/dashboard/settings/password', label: 'Password' },
  ] },
];

/** The Library's own tabs (Places > Library). */
export const LIBRARY_TABS: SectionTab[] = [
  { href: '/dashboard/places/library/cities', label: 'Cities and areas' },
  { href: '/dashboard/places/library/categories', label: 'Categories' },
  { href: '/dashboard/places/library/features', label: 'Features' },
  { href: '/dashboard/places/library/badges', label: 'Badge rules' },
  { href: '/dashboard/places/library/collections', label: 'Collections' },
];

/** The best match for an address: the longest tab href it sits under. */
export function matchHref(path: string, hrefs: string[]) {
  return hrefs.filter((href) => path === href || (href !== '/dashboard' && path.startsWith(href + '/')))
    .sort((a, b) => b.length - a.length)[0];
}

/** The section and tab an address belongs to. Library pages light the Library tab. */
export function locate(path: string, sections: Section[] = SECTIONS) {
  const entries = sections.flatMap((section) => [section.href, ...section.tabs.flatMap((tab) => [tab.href, ...(tab.also ?? [])])].map((href) => ({ href, section })));
  const href = matchHref(path, entries.map((entry) => entry.href));
  const section = entries.find((entry) => entry.href === href)?.section;
  const tab = section?.tabs.find((entry) => entry.href === href || entry.also?.includes(href!) || (path.startsWith('/dashboard/places/library') && entry.label === 'Library'));
  return { section, tab };
}
