'use client';

/**
 * FooterSettingsCard — edit the brand's social links and footer contact.
 *
 * These feed the web footer and the app, so they belong in one place, not per-page. A blank
 * field clears that link; the site just omits the icon.
 */

import { DashboardText } from '@/components/admin/dashboard-text';
import { ContentSkeleton } from '@/components/admin/content-skeleton';
import * as React from 'react';
// lucide-react dropped its brand glyphs (Instagram/Facebook/…). Use neutral icons; the
// label names the network.
import { Camera, ThumbsUp, Play, MessageCircle, Mail, Phone, Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { FormActionBar } from './form-action-bar';
import { useFormChanges } from '@/lib/use-form-changes';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi, AdminApiError } from '@/lib/api/admin-client';

type Settings = {
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  youtube?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  phone?: string | null;
};

const FIELDS: { key: keyof Settings; label: string; placeholder: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/khargny', Icon: Camera },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/khargny', Icon: ThumbsUp },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@khargny', Icon: Music2 },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@khargny', Icon: Play },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '201234567890', Icon: MessageCircle },
  { key: 'email', label: 'Email', placeholder: 'hello@khargny.com', Icon: Mail },
  { key: 'phone', label: 'Phone', placeholder: '+20 100 000 0000', Icon: Phone },
];

export function FooterSettingsCard({ active = true, onActivate }: { active?: boolean; onActivate?: () => void }) {
  const [values, setValues] = React.useState<Settings>({});
  const [original, setOriginal] = React.useState<Settings>({});
  const [error, setError] = React.useState('');
  const formChanges = useFormChanges(FIELDS.map(({ key }) => values[key] ?? ''), FIELDS.map(({ key }) => original[key] ?? ''));
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    adminApi
      .get<Settings>('/v1/site-settings')
      .then((row) => { setValues(row ?? {}); setOriginal(row ?? {}); })
      .catch(() => toast.error('Could not load footer settings.'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof Settings, v: string) => setValues((p) => ({ ...p, [key]: v }));

  const save = async () => {
    setError('');
    setSaving(true);
    try {
      // Send strings; the backend treats "" as clear.
      const body: Record<string, string> = {};
      for (const f of FIELDS) body[f.key] = (values[f.key] ?? '') as string;
      const row = await adminApi.put<Settings>('/v1/admin/site-settings', body);
      setValues(row ?? values); setOriginal(row ?? values);
      toast.success('Footer settings saved.');
    } catch (e) {
      const err = e as AdminApiError;
      setError(err.message || 'Could not save. Check the links are valid URLs.');
      toast.error(err.message || 'Could not save. Check the links are valid URLs.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card onFocusCapture={onActivate}>
      <CardHeader>
        <CardTitle><DashboardText>Footer &amp; social</DashboardText></CardTitle>
        <CardDescription>
          <DashboardText>Shown in the website footer and the app. Leave a field blank to hide that icon.</DashboardText>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ContentSkeleton />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(({ key, label, placeholder, Icon }) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`footer-${key}`} className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {label}
                  </Label>
                  <Input
                    id={`footer-${key}`}
                    value={(values[key] ?? '') as string}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder={placeholder}
                    data-trace-id={`footer-setting-${key}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <FormActionBar active={active} dirty={formChanges.dirty} saving={saving} error={error} onSave={() => { void save(); }} cancelHref="/dashboard" traceId="footer-settings-save" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
