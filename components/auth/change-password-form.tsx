'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { request } from '@/lib/api/api-client';

function validateNewPassword(value: string): string | undefined {
  if (!value) return 'New password is required';
  if (value.length < 8) return 'New password must be at least 8 characters';
  if (!/[A-Za-z]/.test(value)) {
    return 'New password must contain at least one letter';
  }
  if (!/\d/.test(value)) return 'New password must contain at least one number';
  return undefined;
}

function validateConfirm(value: string, next: string): string | undefined {
  if (!value) return 'Please confirm your new password';
  if (value !== next) return "Passwords don't match";
  return undefined;
}

export function ChangePasswordForm() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrentError, setShowCurrentError] = useState(false);
  const [showConfirmError, setShowConfirmError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const newPasswordError = validateNewPassword(next);
  const confirmError = validateConfirm(confirm, next);
  const currentError = showCurrentError && !current ? 'Current password is required' : undefined;

  const isValid =
    current.length > 0 && !newPasswordError && !confirmError;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setShowCurrentError(true);
    setShowConfirmError(true);
    if (!isValid) return;
    setError('');
    setSubmitting(true);

    try {
      await request({
        method: 'POST',
        path: '/v1/auth/change-password',
        body: {
          current_password: current,
          new_password: next,
        },
      });
      toast.success('Password changed successfully', {
        description: 'You remain signed in. Other sessions were revoked.',
        icon: <Check className="h-4 w-4" />,
      });
      setCurrent('');
      setNext('');
      setConfirm('');
      setShowCurrentError(false);
      setShowConfirmError(false);
      router.refresh();
    } catch (err: unknown) {
      const e = err as {
        status?: number;
        code?: string;
        message?: string;
      };
      if (e?.status === 401) {
        setError('Current password is incorrect');
      } else if (e?.message) {
        setError(e.message);
      } else {
        setError('Could not change password. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const showConfirm = showConfirmError && !!confirmError;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      data-trace-id="auth-change-password-form"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-current">Current password</Label>
        <Input
          id="cp-current"
          name="current_password"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          onBlur={() => setShowCurrentError(true)}
          aria-invalid={!!currentError}
          required
          data-trace-id="auth-change-password-current"
        />
        {currentError && (
          <p className="text-xs text-destructive">{currentError}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-new">New password</Label>
        <Input
          id="cp-new"
          name="new_password"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          aria-invalid={!!newPasswordError}
          required
          data-trace-id="auth-change-password-new"
        />
        {newPasswordError && (
          <p className="text-xs text-destructive">{newPasswordError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          At least 8 characters with 1 letter and 1 number.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cp-confirm">Confirm new password</Label>
        <Input
          id="cp-confirm"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setShowConfirmError(true)}
          aria-invalid={!!confirmError}
          required
          data-trace-id="auth-change-password-confirm"
        />
        {showConfirm && confirmError && (
          <p className="text-xs text-destructive">{confirmError}</p>
        )}
      </div>

      {error && (
        <div
          data-trace-id="auth-change-password-error"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={!isValid || submitting}
          data-trace-id="auth-change-password-submit"
          className="h-11 min-w-40"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Changing…
            </>
          ) : (
            'Change password'
          )}
        </Button>
      </div>
    </form>
  );
}
