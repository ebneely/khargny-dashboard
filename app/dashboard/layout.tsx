import { Suspense } from "react";
import Link from "next/link";
import { DashboardHomeLink } from "@/components/admin/dashboard-text";
import Image from "next/image";
import { ProfileHeader } from "@/components/auth/profile-header";
import { getServerSession } from "@/lib/auth-server";
import { ReadOnlyGate } from "@/components/auth/read-only-gate";
import { DashboardNav, SectionTabs, type NavItem } from "@/components/admin/dashboard-nav";
import { DashboardLangProvider } from "@/lib/dashboard-lang";
import { DashboardLangToggle } from "@/components/admin/dashboard-lang-toggle";

// Six jobs, nothing else (spec 002 US8): each item is a landing page and every existing route
// sits in exactly one of them as a tab. `superAdminOnly` tabs are filtered out server-side, so a
// non-super-admin never receives the link in the HTML at all.
//
// Icons are referenced by NAME, not by component: this is a Server Component and the nav is
// a Client Component, and a lucide icon is a function — passing one across that boundary
// throws a Server Components render error. The client maps the name to a component.
const NAV_SECTIONS = [
  { href: "/dashboard/inbox", label: "Inbox", iconName: "inbox", tabs: [{ href: "/dashboard/inbox", label: "Inbox" }] },
  { href: "/dashboard/places", label: "Places", iconName: "places", tabs: [
    { href: "/dashboard/places", label: "Places" },
    { href: "/dashboard/collections", label: "Collections" },
    { href: "/dashboard/cities", label: "Cities and areas" },
    { href: "/dashboard/categories", label: "Categories" },
    { href: "/dashboard/tags", label: "Keywords" },
    { href: "/dashboard/amenities", label: "Amenities" },
    { href: "/dashboard/badges", label: "Badges" },
  ] },
  { href: "/dashboard/subscribers", label: "Money", iconName: "money", tabs: [
    { href: "/dashboard/subscribers", label: "Subscribers" },
    { href: "/dashboard/ads", label: "Ads" },
  ] },
  { href: "/dashboard/tourism", label: "Marketplace", iconName: "marketplace", tabs: [{ href: "/dashboard/tourism", label: "Trips" }] },
  { href: "/dashboard/analytics", label: "Numbers", iconName: "numbers", tabs: [
    { href: "/dashboard/analytics", label: "Answers and overview" },
    { href: "/dashboard/insights", label: "Places engagement" },
    { href: "/dashboard/analytics/search-terms", label: "Search terms" },
    { href: "/dashboard/analytics/missing-words", label: "Missing words" },
    { href: "/dashboard/analytics/movement", label: "Movement" },
    { href: "/dashboard/analytics/keywords", label: "Keyword searches" },
  ] },
  { href: "/dashboard/settings", label: "Settings", iconName: "settings", tabs: [
    { href: "/dashboard/settings", label: "General" },
    { href: "/dashboard/settings/api-keys", label: "Connection keys" },
    { href: "/dashboard/settings/change-password", label: "Password" },
    { href: "/dashboard/storefront", label: "Website footer" },
    { href: "/dashboard/admins", label: "Admins", superAdminOnly: true },
  ] },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  // A viewer sees everything and can change nothing — the gate disables every field and
  // button in the content area while leaving the nav live.
  const isViewer = session?.user?.role === "viewer";
  const navItems: NavItem[] = NAV_SECTIONS.map((section) => ({
    href: section.href, label: section.label, iconName: section.iconName,
    tabs: section.tabs.filter((tab) => !("superAdminOnly" in tab) || isSuperAdmin).map(({ href, label }) => ({ href, label })),
  }));

  return (
    // The whole dashboard is wrapped in the language provider so the global EN/ع toggle and
    // every bilingual label/dropdown share one view language.
    <DashboardLangProvider>
      {/* Column on small screens (top bar over content), row from lg up (rail beside it). The
          layout used to be row-only with a fixed 240px rail, which on a phone left barely more
          than half the viewport for the actual page. */}
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Compact mobile bar: menu button, logo, then the language toggle + a small profile
            dropdown pushed to the end. Everything shrinks so it fits a phone without wrapping
            or pushing the logo off-screen. */}
        <header className="print-hide relative z-50 flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2.5 lg:hidden">
          <DashboardNav items={navItems} />
          <DashboardHomeLink>
            <Image src="/khargny-logo.png" alt="" width={22} height={28} className="h-6 w-auto" />
          </DashboardHomeLink>
          <div className="ms-auto flex min-w-0 items-center gap-2">
            <DashboardLangToggle />
            <ProfileHeader compact />
          </div>
        </header>

        <aside className="print-hide sticky top-0 h-dvh hidden w-60 shrink-0 flex-col self-start overflow-hidden border-e border-border bg-card px-4 pb-2 pt-4 lg:flex">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
            <Image
              src="/khargny-logo.png"
              alt="Khargny"
              width={28}
              height={36}
              className="h-9 w-auto"
            />
            <span className="font-display text-lg font-semibold text-foreground">
              خرجني
            </span>
          </Link>
          <DashboardLangToggle />
          </div>
          <div data-slot="sidebar-navigation" className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]"><DashboardNav items={navItems} /></div>
          <div data-slot="sidebar-account" className="shrink-0 border-t border-border pt-1.5"><ProfileHeader /></div>
        </aside>

        {/* Padding steps up with the viewport rather than sitting at a desktop 32px on a
            360px phone, where it cost nearly a fifth of the width. min-w-0 lets wide tables
            scroll inside the main column instead of stretching the page. */}
        <main className="min-w-0 flex-1 bg-background px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <Suspense fallback={null}><SectionTabs items={navItems} /></Suspense>
          <ReadOnlyGate readOnly={isViewer}><Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}>{children}</Suspense></ReadOnlyGate>
        </main>
      </div>
    </DashboardLangProvider>
  );
}
