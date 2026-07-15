import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/components/auth/change-password-form';

export const metadata = {
  title: 'Change password — Khargny admin',
};

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-2 font-display text-2xl font-semibold text-foreground">
        Change password
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Pick a strong password. Other browsers signed in with this account will
        be signed out on the next refresh.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Update your password</CardTitle>
          <CardDescription>
            You will stay signed in on this device after the change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
