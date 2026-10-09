'use client';

import { PageActions } from '@/components/admin/page-actions';

import { DashboardText } from '@/components/admin/dashboard-text';
import { useState } from 'react';
import { FormActionBar } from '@/components/admin/form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { useRouter } from 'next/navigation';

import { AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/lib/api/admin-client';
import { ADMIN_ROLES, type AdminRole } from '@/lib/api/types';

interface FieldErrors {
  email?: string;
  password?: string;
  role?: string;
}

function clientValidate(email: string, password: string, role: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }
  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  if (!role) {
    errors.role = 'Role is required';
  } else if (!ADMIN_ROLES.includes(role as AdminRole)) {
    errors.role = 'Role is invalid';
  }
  return errors;
}

export default function NewAdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('admin');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const formChanges = useFormChanges({ email, password, role }, { email: '', password: '', role: 'admin' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const errors = clientValidate(email, password, role);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await adminApi.post('/v1/admin/admins', { email, password, role });
      router.push('/dashboard/admins');
      formChanges.markSaved();
    } catch (e: unknown) {
      const err = e as { status?: number; code?: string; message?: string };
      // 409 (email taken), 422 (validation), 403 (forbidden) — all surface as card-level.
      if (err.status === 409) {
        setServerError('An admin with this email already exists.');
      } else if (err.status === 422) {
        setServerError(err.message || 'The server rejected the request. Check your inputs.');
      } else if (err.status === 403) {
        setServerError('You don\'t have permission to create admins.');
      } else {
        setServerError(err.message || 'Failed to create admin.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          <DashboardText>Add admin</DashboardText>
        </h1>
        <PageActions form actions={[{ label: "Cancel", href: "/dashboard/admins", traceId: "admin-new-cancel", readOnly: true }]} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle><DashboardText>Admin details</DashboardText></CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                data-trace-id="admin-new-server-error"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-new-email"><DashboardText>Email</DashboardText></Label>
              <Input
                id="admin-new-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                }}
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'admin-new-email-err' : undefined}
                data-trace-id="admin-new-email"
              />
              {fieldErrors.email && (
                <p id="admin-new-email-err" className="text-xs text-destructive">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-new-password"><DashboardText>Initial password</DashboardText></Label>
              <Input
                id="admin-new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                }}
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'admin-new-password-err' : undefined}
                data-trace-id="admin-new-password"
              />
              {fieldErrors.password && (
                <p id="admin-new-password-err" className="text-xs text-destructive">
                  {fieldErrors.password}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                <DashboardText>Must be at least 8 characters. The admin should change this on first login.</DashboardText>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-new-role"><DashboardText>Role</DashboardText></Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as AdminRole)}>
                <SelectTrigger id="admin-new-role" data-trace-id="admin-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin"><DashboardText>Super admin</DashboardText></SelectItem>
                  <SelectItem value="admin"><DashboardText>Admin</DashboardText></SelectItem>
                  <SelectItem value="viewer"><DashboardText>Viewer</DashboardText></SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <strong><DashboardText>Super admin</DashboardText></strong><DashboardText>: full control.</DashboardText> <strong><DashboardText>Editor</DashboardText></strong><DashboardText>: content management.</DashboardText> <strong><DashboardText>Viewer</DashboardText></strong><DashboardText>: read-only.</DashboardText>
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <FormActionBar dirty={formChanges.dirty} saving={saving} error={serverError} disabled={saving} cancelHref="/dashboard/admins" traceId="admin-new-submit" />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
