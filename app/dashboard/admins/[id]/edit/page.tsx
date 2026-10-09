'use client';

import { PageActions } from '@/components/admin/page-actions';

import { DashboardText } from '@/components/admin/dashboard-text';
import { useEffect, useState } from 'react';
import { FormActionBar } from '@/components/admin/form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAdmin } from '@/lib/api/hooks/use-admins';
import { useCurrentSession } from '@/lib/api/hooks/use-current-session';
import { adminApi } from '@/lib/api/admin-client';
import { ADMIN_ROLES, ADMIN_STATUSES, type AdminRole, type AdminStatus } from '@/lib/api/types';

export default function EditAdminPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: admin, isLoading, isError, refetch } = useAdmin(id);
  const { data: session } = useCurrentSession();

  const [role, setRole] = useState<AdminRole>('admin');
  const [status, setStatus] = useState<AdminStatus>('active');
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formReady, setFormReady] = useState(false);

  const formChanges = useFormChanges({ role, status }, { role: admin ? admin.role : 'admin', status: admin ? admin.status : 'active' });
  // Seed form once the admin loads. Mirrors the pattern in places/[id]/page.tsx.
  useEffect(() => {
    if (admin) {
      setRole(admin.role);
      setStatus(admin.status);
      setFormReady(true);
    }
  }, [admin]);

  const currentUserId = session?.user.id;
  const currentUserRole = session?.user.role;
  const isSuperadmin = currentUserRole === 'super_admin';
  const isSelf = currentUserId === id;

  // Access-denied for non-superadmin (FR-009). Mirrors the list page gate.
  if (!isLoading && session && !isSuperadmin) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-foreground mb-6"><DashboardText>Edit admin</DashboardText></h1>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium"><DashboardText>You don&apos;t have access to this page</DashboardText></p>
            <p className="mt-1 text-sm text-muted-foreground">
              <DashboardText>Admin management is restricted to super admins.</DashboardText>
            </p>
            <Link href="/dashboard/admins" className="mt-4 inline-block">
              <Button variant="outline"><DashboardText>Back to admins</DashboardText></Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-3"><DashboardText>Failed to load admin</DashboardText></p>
        <Button variant="outline" onClick={() => refetch()}><DashboardText>Retry</DashboardText></Button>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground"><DashboardText>Admin not found</DashboardText></p>
        <Link href="/dashboard/admins" className="mt-4 inline-block">
          <Button variant="outline"><DashboardText>Back to admins</DashboardText></Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    setSaving(true);
    try {
      await adminApi.patch(`/v1/admin/admins/${id}`, { role, status });
      router.push('/dashboard/admins');
      formChanges.markSaved();
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 403) {
        setServerError(isSelf
          ? 'You cannot change your own role.'
          : 'You don\'t have permission to perform this action.');
      } else if (err.status === 404) {
        setServerError('This admin no longer exists.');
      } else if (err.status === 409) {
        setServerError('That email is already in use.');
      } else {
        setServerError(err.message || 'Failed to update admin.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          <DashboardText>Edit admin</DashboardText>
        </h1>
        <PageActions form actions={[{ label: "Cancel", href: "/dashboard/admins", traceId: "admin-edit-cancel", readOnly: true }]} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{admin.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                data-trace-id="admin-edit-server-error"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-edit-email"><DashboardText>Email</DashboardText></Label>
              <Input
                id="admin-edit-email"
                type="email"
                value={admin.email}
                disabled
                readOnly
                data-trace-id="admin-edit-email"
              />
              <p className="text-xs text-muted-foreground">
                <DashboardText>Email is set at creation and cannot be changed here.</DashboardText>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-edit-role"><DashboardText>Role</DashboardText></Label>
              <Select
                value={role}
                onValueChange={(v) => v && setRole(v as AdminRole)}
                disabled={!formReady || isSelf}
              >
                <SelectTrigger id="admin-edit-role" data-trace-id="admin-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r === 'super_admin' ? 'Super admin' : r === 'admin' ? 'Admin' : 'Viewer'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSelf && (
                <p className="text-xs text-muted-foreground">
                  <DashboardText>You cannot change your own role.</DashboardText>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-edit-status"><DashboardText>Status</DashboardText></Label>
              <Select
                value={status}
                onValueChange={(v) => v && setStatus(v as AdminStatus)}
                disabled={!formReady}
              >
                <SelectTrigger id="admin-edit-status" data-trace-id="admin-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === 'active' ? 'Active' : 'Disabled'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <DashboardText>Set to &quot;Disabled&quot; to revoke this admin&apos;s access. Use the Disable action on the list page for the recommended flow (it also handles the sign-out side effect).</DashboardText>
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
              <p>
                <strong><DashboardText>Created:</DashboardText></strong> {new Date(admin.createdAt).toLocaleString()}
              </p>
              <p className="mt-1">
                <strong><DashboardText>Last login:</DashboardText></strong> {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString() : '—'}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <FormActionBar dirty={formChanges.dirty} saving={saving} error={serverError} disabled={saving || !formReady} cancelHref="/dashboard/admins" traceId="admin-edit-submit" />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
