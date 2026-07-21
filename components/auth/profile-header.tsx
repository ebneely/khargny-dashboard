'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, LogOut, KeyRound, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';

function roleLabel(role: string): string {
  if (role === 'super_admin') return 'Super admin';
  if (role === 'admin') return 'Admin';
  if (role === 'viewer') return 'Viewer';
  return role;
}

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  if (role === 'super_admin') return 'default';
  if (role === 'admin') return 'secondary';
  return 'outline';
}

export function ProfileHeader({ compact }: { compact?: boolean } = {}) {
  const router = useRouter();
  const { data, isLoading, isError } = useCurrentSession();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Defensive — even on network error, redirect to login.
    }
    router.push('/login?redirect=/dashboard');
    router.refresh();
  };

  // Session expired / unreachable (after the one-shot refresh in the hook failed):
  // show an actionable sign-in prompt instead of an endless loading skeleton, so the
  // sidebar never looks half-built.
  if (isError && !data) {
    return (
      <div
        data-trace-id="auth-profile-header"
        className="mb-4 flex items-center justify-between gap-3 rounded-(--radius-ds-lg) border border-border bg-card px-3 py-3"
      >
        <span className="text-sm text-muted-foreground">Session expired</span>
        <Link
          href="/login?redirect=/dashboard"
          className="text-sm font-medium text-primary hover:underline"
          data-trace-id="auth-profile-signin"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div
        data-trace-id="auth-profile-header"
        className="mb-4 flex items-center gap-3 rounded-(--radius-ds-lg) border border-border bg-card px-3 py-3"
      >
        <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  const initials = (data.user.email || '?')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  // The menu content is identical in both layouts — defined once.
  const menuContent = (
    <DropdownMenuContent align="end" sideOffset={6} className="min-w-48">
      <DropdownMenuLabel className="flex items-center gap-2 font-normal">
        <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="truncate text-xs">{data.user.email}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        render={
          <Link
            href="/dashboard/settings/change-password"
            data-trace-id="auth-profile-change-password"
          />
        }
      >
        <KeyRound className="h-3.5 w-3.5" />
        Change password
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onClick={handleSignOut}
        disabled={signingOut}
        data-trace-id="auth-profile-signout"
      >
        <LogOut className="h-3.5 w-3.5" />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  // Compact (mobile header): the whole control is one small dropdown trigger — avatar +
  // role, no email, no card — so it can't push the logo and menu button off the row. The
  // email lives inside the menu. The full card is for the desktop sidebar only.
  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card py-1 pe-1.5 ps-1 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          data-trace-id="auth-profile-menu"
          aria-label={`${roleLabel(data.user.role)} — profile menu`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {roleLabel(data.user.role)}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    );
  }

  return (
    <div
      data-trace-id="auth-profile-header"
      className="mb-4 flex items-center gap-3 rounded-(--radius-ds-lg) border border-border bg-card px-3 py-3"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {data.user.email}
          </span>
        </div>
        <Badge
          variant={roleBadgeVariant(data.user.role)}
          className="mt-1"
          data-trace-id="auth-profile-role-badge"
        >
          {roleLabel(data.user.role)}
        </Badge>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          data-trace-id="auth-profile-menu"
          aria-label="Open profile menu"
        >
          <ChevronDown className="h-4 w-4" />
        </DropdownMenuTrigger>
        {menuContent}
      </DropdownMenu>
    </div>
  );
}
