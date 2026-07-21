import Link from "next/link";
import Image from "next/image";
import { ProfileHeader } from "@/components/auth/profile-header";
import { getServerSession } from "@/lib/auth-server";
import { ReadOnlyGate } from "@/components/auth/read-only-gate";
import { DashboardNav, type NavItem } from "@/components/admin/dashboard-nav";

// `superAdminOnly` items are filtered out server-side, so a non-super-admin never
// receives the link in the HTML at all — nothing to flash, nothing to find on refresh.
//
// Home leads the list: /dashboard is the insights page and had no nav entry at all, so the
// only way back to it was the logo.
//
// Icons are referenced by NAME, not by component: this is a Server Component and the nav is
// a Client Component, and a lucide icon is a function — passing one across that boundary
// throws a Server Components render error. The client maps the name to a component.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", iconName: "home" },
  { href: "/dashboard/storefront", label: "Storefront", iconName: "storefront" },
  { href: "/dashboard/places", label: "Places", iconName: "places" },
  { href: "/dashboard/cities", label: "Cities", iconName: "cities" },
  { href: "/dashboard/categories", label: "Categories", iconName: "categories" },
  { href: "/dashboard/amenities", label: "Amenities", iconName: "amenities" },
  { href: "/dashboard/tags", label: "Tags", iconName: "tags" },
  { href: "/dashboard/admins", label: "Admins", iconName: "admins", superAdminOnly: true },
  { href: "/dashboard/settings", label: "Settings", iconName: "settings" },
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
  const navItems: NavItem[] = NAV_ITEMS.filter(
    (item) => !("superAdminOnly" in item && item.superAdminOnly) || isSuperAdmin,
  ).map(({ href, label, iconName }) => ({ href, label, iconName }));

  return (
    // Column on small screens (top bar over content), row from lg up (rail beside it). The
    // layout used to be row-only with a fixed 240px rail, which on a phone left barely more
    // than half the viewport for the actual page.
    <div className="flex min-h-screen flex-col lg:flex-row">
      <header className="relative flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
        <DashboardNav items={navItems} />
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/khargny-logo.png"
            alt="Khargny"
            width={24}
            height={31}
            className="h-7 w-auto"
          />
          <span className="font-display text-base font-semibold text-foreground">
            خرجني
          </span>
        </Link>
        <div className="ms-auto">
          <ProfileHeader />
        </div>
      </header>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-6 lg:flex">
        <Link href="/dashboard" className="mb-6 flex items-center gap-2">
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
        <ProfileHeader />
        <DashboardNav items={navItems} />
      </aside>

      {/* Padding steps up with the viewport rather than sitting at a desktop 32px on a
          360px phone, where it cost nearly a fifth of the width. min-w-0 lets wide tables
          scroll inside the main column instead of stretching the page. */}
      <main className="min-w-0 flex-1 bg-background px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <ReadOnlyGate readOnly={isViewer}>{children}</ReadOnlyGate>
      </main>
    </div>
  );
}
