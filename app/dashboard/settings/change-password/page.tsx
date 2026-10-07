import { DashboardText } from '@/components/admin/dashboard-text';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/components/auth/change-password-form';

export const metadata = {
  title: 'Change password — Khargny admin',
};

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/settings" className="mb-3 inline-block text-sm text-muted-foreground underline underline-offset-4"><DashboardText>Back to settings</DashboardText></Link>
      <h1 className="mb-2 font-display text-2xl font-semibold text-foreground">
        <DashboardText>Change password</DashboardText>
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        <DashboardText>Pick a strong password. Other browsers signed in with this account will be signed out on the next refresh.</DashboardText>
      </p>

      <Card>
        <CardHeader>
          <CardTitle><DashboardText>Update your password</DashboardText></CardTitle>
          <CardDescription>
            <DashboardText>You will stay signed in on this device after the change.</DashboardText>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
