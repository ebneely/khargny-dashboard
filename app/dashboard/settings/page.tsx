import { DashboardText } from '@/components/admin/dashboard-text';
import Link from '@/components/lang-link';
import { ChevronRight, Globe, HeartPulse, KeyRound, Lock, ScrollText, Users, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerSession } from '@/lib/auth-server';

type Row = { href: string; title: string; description: string; icon: LucideIcon; superAdminOnly?: boolean };

// Rare changes, grouped by what they touch (DIRECTION section 1: "Settings (profile menu)").
const GROUPS: { title: string; rows: Row[] }[] = [
  { title: 'My account', rows: [
    { href: '/dashboard/settings/password', title: 'Change password', description: 'Rotate your password. Other signed-in sessions will be revoked on the next refresh.', icon: Lock },
  ] },
  { title: 'Team', rows: [
    { href: '/dashboard/settings/team', title: 'Team', description: 'Who can sign in to this dashboard, and what each person can change.', icon: Users, superAdminOnly: true },
    { href: '/dashboard/settings/audit-log', title: 'Audit log', description: 'Every change made in the dashboard, who made it and when.', icon: ScrollText, superAdminOnly: true },
  ] },
  { title: 'Website', rows: [
    { href: '/dashboard/settings/website', title: 'Website footer and social links', description: 'The footer text and the social links on 5argny.com.', icon: Globe },
    { href: '/dashboard/settings/media-health', title: 'Media health', description: 'Photos and videos that fail to load, and how to fix them.', icon: HeartPulse },
  ] },
  { title: 'Connections', rows: [
    { href: '/dashboard/settings/api-keys', title: 'Connection keys', description: 'Give AI assistants scoped access. Create, copy once, and revoke your own keys.', icon: KeyRound },
  ] },
];

export default async function SettingsPage() {
  // The reset destroys the whole catalog, so only a super_admin is even shown it. The
  // backend's RolesGuard enforces this independently — this is presentation, not security.
  const session = await getServerSession();
  const isSuperAdmin = session?.user?.role === 'super_admin';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground"><DashboardText>Settings</DashboardText></h1>
        <p className="mt-1 text-sm text-muted-foreground"><DashboardText>Rare changes: your account, the team, the website and connections.</DashboardText></p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {GROUPS.map((group) => {
          const rows = group.rows.filter((row) => !row.superAdminOnly || isSuperAdmin);
          if (!rows.length) return null;
          return (
            <Card key={group.title}>
              <CardHeader><CardTitle><DashboardText>{group.title}</DashboardText></CardTitle></CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                {rows.map((row) => (
                  <Link key={row.href} href={row.href} className="group flex items-center gap-4 py-3 first:pt-0 last:pb-0" data-trace-id={row.href.endsWith('/api-keys') ? 'auth-settings-api-keys-link' : row.href.endsWith('/password') ? 'auth-settings-change-password-link' : undefined}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-primary"><row.icon className="size-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground"><DashboardText>{row.title}</DashboardText></span>
                      <span className="block text-xs text-muted-foreground"><DashboardText>{row.description}</DashboardText></span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground rtl:rotate-180" aria-hidden="true" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

    </div>
  );
}
