import Link from 'next/link';
import { ChevronRight, KeyRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SUB_SECTIONS = [
  {
    href: '/dashboard/settings/change-password',
    title: 'Change password',
    description: 'Rotate your password. Other signed-in sessions will be revoked on the next refresh.',
    icon: KeyRound,
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage your own account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Settings specific to your admin account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {SUB_SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-center gap-4 py-3 first:pt-0 last:pb-0 transition-colors hover:text-foreground"
              data-trace-id="auth-settings-change-password-link"
            >
              <s.icon className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
