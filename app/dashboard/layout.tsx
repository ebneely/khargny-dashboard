import Link from "next/link";
import Image from "next/image";
import { ProfileHeader } from "@/components/auth/profile-header";

const NAV_ITEMS = [
  { href: "/dashboard/storefront", label: "Storefront" },
  { href: "/dashboard/places", label: "Places" },
  { href: "/dashboard/cities", label: "Cities" },
  { href: "/dashboard/categories", label: "Categories" },
  { href: "/dashboard/amenities", label: "Amenities" },
  { href: "/dashboard/tags", label: "Tags" },
  { href: "/dashboard/admins", label: "Admins" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-6">
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
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-background px-8 py-6">{children}</main>
    </div>
  );
}
