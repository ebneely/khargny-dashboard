import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-server";

/**
 * Server-side gate for /dashboard/admins. The nav link is already filtered out for
 * non-super-admins, but this stops a direct URL (or refresh) from rendering the
 * page at all — the redirect happens before any client component mounts, so
 * there's no flash of the admins UI. The backend RolesGuard remains the real
 * authority; this is the routing-level enforcement.
 */
export default async function AdminsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (session?.user?.role !== "super_admin") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
