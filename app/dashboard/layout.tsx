import { Suspense } from "react";
import { getServerSession } from "@/lib/auth-server";
import { ReadOnlyGate } from "@/components/auth/read-only-gate";
import { DashboardShell } from "@/components/admin/dashboard-shell";
import { DashboardLangProvider } from "@/lib/dashboard-lang";
import { serverLang } from "@/lib/dash-lang-server";
import { SECTIONS, type Section } from "@/lib/dashboard-sections";

// The top panel (Today, Inbox, Places, Money, Marketplace, Numbers, Settings) replaces the sidebar
// (DIRECTION section 1). Super-admin-only tabs are dropped here, on the server, so a
// non-super-admin never receives the link in the HTML at all.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  // A viewer sees everything and can change nothing — the gate disables every field and
  // button in the content area while leaving the navigation live.
  const isViewer = session?.user?.role === "viewer";
  const sections: Section[] = SECTIONS.map((section) => ({ ...section, tabs: section.tabs.filter((tab) => !tab.superAdminOnly || isSuperAdmin) }));

  return (
    <DashboardLangProvider lang={await serverLang()}>
      <div className="flex min-h-screen flex-col bg-background">
        <Suspense fallback={null}>
          <DashboardShell sections={sections}>
            <ReadOnlyGate readOnly={isViewer}><Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted" />}>{children}</Suspense></ReadOnlyGate>
          </DashboardShell>
        </Suspense>
      </div>
    </DashboardLangProvider>
  );
}
