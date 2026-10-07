'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { adminApi } from '@/lib/api/admin-client';
import { optionalText, type SubscriberDetail } from '@/lib/api/subscribers';
import { ActionDialog, type ActionSpec, RequestError, StatusBadge, useSubscriberText } from './subscriber-ui';

export function SubscriberAccountPanel({ subscriber, canWrite, refresh }: { subscriber: SubscriberDetail; canWrite: boolean; refresh: () => Promise<boolean> }) {
  const { text, lang } = useSubscriberText();
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [password, setPassword] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState('');
  const account = subscriber.account;
  const endpoint = `/v1/admin/subscribers/${subscriber.id}/account`;
  const run = async (path: string, body?: unknown, idempotencyKey?: string) => {
    if (!canWrite) return;
    const result = await adminApi.post<{ temporaryPassword?: string | null }>(path, body, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined);
    setCopied(false); setCopyError('');
    if (result.temporaryPassword) setPassword(result.temporaryPassword);
    const refreshed = await refresh();
    if (refreshed) toast.success(text('Account updated', 'تم تحديث الحساب'));
  };
  return <Card id="account"><CardHeader><CardTitle>{text('Subscriber account', 'حساب المشترك')}</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-sm text-muted-foreground">{text('Portal access is separate from dashboard admin accounts.', 'دخول بوابة المشترك منفصل عن حسابات مسؤولي لوحة التحكم.')}</p><StatusBadge status={account?.status ?? 'none'} />{account && <dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">{text('Phone', 'الهاتف')}</dt><dd dir="ltr">{account.phone}</dd></div><div><dt className="text-sm text-muted-foreground">{text('Last sign-in', 'آخر تسجيل دخول')}</dt><dd>{account.lastLoginAt ? new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(account.lastLoginAt)) : text('Never signed in', 'لم يسجل الدخول بعد')}</dd></div></dl>}
    {canWrite && <div className="flex flex-wrap gap-2">{!account ? <Button onClick={() => setAction({ title: text('Create account', 'إنشاء حساب'), fields: [{ name: 'phone', label: text('Phone', 'الهاتف'), type: 'tel', value: subscriber.phone, required: true }, { name: 'password', label: text('Password (optional, at least 8 characters)', 'كلمة المرور (اختيارية، ٨ أحرف على الأقل)'), type: 'password', minLength: 8 }], submit: async (values, idempotencyKey) => { await run(endpoint, { phone: values.phone, password: optionalText(values.password) }, idempotencyKey); } })}>{text('Create account', 'إنشاء حساب')}</Button> : <><Button variant="outline" onClick={() => setAction({ title: text('Reset password?', 'إعادة تعيين كلمة المرور؟'), destructive: true, description: text('All portal sessions end. A new temporary password is shown once.', 'تنتهي جميع جلسات البوابة. ستظهر كلمة مرور مؤقتة جديدة مرة واحدة.'), submit: async () => { await run(`${endpoint}/reset-password`); } })}>{text('Reset password', 'إعادة تعيين كلمة المرور')}</Button><Button variant={account.status === 'active' ? 'destructive' : 'outline'} onClick={() => setAction({ title: account.status === 'active' ? text('Suspend account?', 'إيقاف الحساب؟') : text('Activate account?', 'تفعيل الحساب؟'), destructive: account.status === 'active', description: account.status === 'active' ? text('The subscriber will lose access to the portal until you activate the account.', 'سيفقد المشترك الوصول للبوابة حتى تعيد تفعيل الحساب.') : text('Restore access to the subscriber portal.', 'استعادة الوصول لبوابة المشترك.'), submit: async () => { await run(`${endpoint}/${account.status === 'active' ? 'suspend' : 'activate'}`); } })}>{account.status === 'active' ? text('Suspend', 'إيقاف') : text('Activate', 'تفعيل')}</Button></>}</div>}
    <ActionDialog action={action} onClose={() => setAction(null)} />
    <Dialog open={password !== null} onOpenChange={(open) => { if (!open) { setPassword(null); setCopied(false); setCopyError(''); } }}><DialogContent dir={lang === 'ar' ? 'rtl' : 'ltr'}><DialogHeader><DialogTitle>{text('Temporary password', 'كلمة المرور المؤقتة')}</DialogTitle><DialogDescription>{text('Copy it now and share it securely. It will not be shown again after closing.', 'انسخها الآن وشاركها بشكل آمن. لن تظهر مرة أخرى بعد الإغلاق.')}</DialogDescription></DialogHeader><div className="flex items-center gap-2"><code dir="ltr" className="min-w-0 flex-1 break-all rounded-lg bg-muted p-3 select-all">{password}</code><Button variant="outline" aria-label={text('Copy password', 'نسخ كلمة المرور')} onClick={async () => { try { await navigator.clipboard.writeText(password ?? ''); setCopied(true); setCopyError(''); } catch { setCopyError(text('Copy failed. Select and copy the password manually before closing.', 'تعذر النسخ. حدد كلمة المرور وانسخها يدوياً قبل الإغلاق.')); } }}><Copy className="size-4" aria-hidden="true" />{copied ? text('Copied', 'تم النسخ') : text('Copy', 'نسخ')}</Button></div>{copyError && <RequestError message={copyError} />}<Button onClick={() => setPassword(null)}>{text('I have saved it — close', 'حفظتها — إغلاق')}</Button></DialogContent></Dialog>
  </CardContent></Card>;
}
