'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [role, setRole] = useState<AdminRole>('editor');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
          Add admin
        </h1>
        <Link href="/dashboard/admins">
          <Button variant="outline" data-trace-id="admin-new-cancel">Cancel</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin details</CardTitle>
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
              <Label htmlFor="admin-new-email">Email</Label>
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
              <Label htmlFor="admin-new-password">Initial password</Label>
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
                Must be at least 8 characters. The admin should change this on first login.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-new-role">Role</Label>
              <Select value={role} onValueChange={(v) => v && setRole(v as AdminRole)}>
                <SelectTrigger id="admin-new-role" data-trace-id="admin-new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <strong>Super admin</strong>: full control. <strong>Editor</strong>: content
                management. <strong>Viewer</strong>: read-only.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving} data-trace-id="admin-new-submit">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {saving ? 'Creating…' : 'Create admin'}
              </Button>
              <Link href="/dashboard/admins">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
