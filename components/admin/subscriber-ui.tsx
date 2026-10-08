'use client';

import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { AdminApiError } from '@/lib/api/admin-client';
import { decimalMoney, type Money } from '@/lib/api/subscribers';

export function useSubscriberText() {
  const { lang, pick } = useDashboardLang();
  const text = React.useCallback((en: string, ar: string) => lang === 'ar' ? ar : en, [lang]);
  return { lang, pick, text };
}

export function subscriberError(error: unknown, lang: 'en' | 'ar'): string {
  const messages: Record<string, [string, string]> = {
    PLACE_ALREADY_OWNED: ['This place belongs to another subscriber. Remove it or ask an admin to unlink it first.', 'هذا المكان مرتبط بمشترك آخر. أزله أو اطلب من المسؤول فك الارتباط أولاً.'],
    SUBSCRIPTION_OVERLAP: ['These dates overlap an existing subscription for this place. Choose another date range.', 'هذه التواريخ تتداخل مع اشتراك قائم لهذا المكان. اختر فترة أخرى.'],
    SUBSCRIPTION_CANCELLED: ['This subscription was cancelled; create a new one instead.', 'تم إلغاء هذا الاشتراك؛ أنشئ اشتراكاً جديداً.'],
    INVALID_PHONE: ['Enter a valid Egyptian mobile number (01XXXXXXXXX or +20).', 'أدخل رقم محمول مصري صحيحاً (01XXXXXXXXX أو +20).'],
    INVALID_AMOUNT: ['Enter a non-negative amount with at most two decimal places.', 'أدخل مبلغاً غير سالب بمنزلتين عشريتين كحد أقصى.'],
    INVALID_MENU_IMAGE_TYPE: ['Choose a JPEG, PNG or WebP image.', 'اختر صورة JPEG أو PNG أو WebP.'],
    MENU_IMAGE_TOO_LARGE: ['The image must be at most 5 MB.', 'يجب ألا يتجاوز حجم الصورة ٥ ميجابايت.'],
  };
  const code = error instanceof AdminApiError ? error.code : error instanceof Error ? error.message : '';
  const known = messages[code];
  if (known) return known[lang === 'ar' ? 1 : 0];
  return lang === 'ar' ? 'تعذر إكمال الطلب. تحقق من الاتصال ثم أعد المحاولة.' : (error instanceof Error ? error.message : 'Request failed. Check your connection and retry.');
}

export function MoneyText({ value, mutedUnit = false }: { value: Money; mutedUnit?: boolean }) {
  const { text } = useSubscriberText();
  return <span className="tabular-nums" dir="auto">{value === null ? text('Hidden', 'محجوب') : mutedUnit ? <>{value} <span className="text-muted-foreground">{text('EGP', 'جنيه')}</span></> : `${value} ${text('EGP', 'جنيه')}`}</span>;
}

export function subscriberValidation(error: unknown, fieldNames: string[], lang: 'en' | 'ar') {
  const fields: Record<string, string> = {};
  const unknown: string[] = [];
  if (error instanceof AdminApiError && error.code === 'VALIDATION_ERROR') {
    for (const [name, message] of Object.entries(error.fields)) {
      const candidate = name.startsWith('payment.') ? name === 'payment.notes' ? 'paymentNotes' : name.slice(8) : name;
      if (fieldNames.includes(candidate)) fields[candidate] = message;
      else unknown.push(`${name}: ${message}`);
    }
  }
  return { fields, message: [subscriberError(error, lang), ...unknown].join(' — ') };
}

export function SavedRefreshError({ retry }: { retry: () => void }) {
  const { text } = useSubscriberText();
  return <RequestError message={text('Saved, but the page could not refresh', 'تم الحفظ، لكن تعذر تحديث الصفحة')} retry={retry} />;
}

export function StatusBadge({ status, children, ...props }: { status: string } & React.ComponentProps<typeof Badge>) {
  const { text } = useSubscriberText();
  const labels: Record<string, [string, string]> = { expiring: ['Expiring', 'ينتهي قريباً'], revoked: ['Revoked', 'ملغى'], draft: ['Draft', 'مسودة'], disabled: ['Disabled', 'معطل'], deleted: ['Deleted', 'محذوف'], live: ['Live', 'مباشر'], paused: ['Paused', 'متوقفة'], ended: ['Ended', 'منتهية'], active: ['Active', 'نشط'], inactive: ['Inactive', 'غير نشط'], scheduled: ['Scheduled', 'مجدول'], expired: ['Expired', 'منتهي'], cancelled: ['Cancelled', 'ملغى'], suspended: ['Suspended', 'موقوف'], none: ['No account', 'بدون حساب'] };
  const label = labels[status] ?? [status, status];
  const tone = ['active', 'live'].includes(status) ? 'success' : ['paused', 'expiring'].includes(status) ? 'warning' : ['deleted', 'cancelled'].includes(status) ? 'danger' : status === 'scheduled' ? 'info' : 'neutral';
  return <Badge {...props} variant="secondary" data-slot="status-chip" data-tone={tone} title={props.title ?? (typeof children === 'string' ? children : text(...label))}>{children ?? text(...label)}</Badge>;
}

export function RequestError({ message, retry }: { message: string; retry?: () => void }) {
  const { text } = useSubscriberText();
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert"><p className="text-sm text-destructive">{message}</p>{retry && <Button data-ro-allow="true" variant="outline" onClick={retry}>{text('Retry', 'إعادة المحاولة')}</Button>}</div>;
}

export function LoadingState() {
  const { text } = useSubscriberText();
  return <div role="status" className="space-y-3 py-6"><span className="sr-only">{text('Loading…', 'جارٍ التحميل…')}</span><Skeleton className="h-5 w-1/3" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>;
}

export function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  const id = React.useId();
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label>{React.isValidElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>(children) ? React.cloneElement(children, { id, 'aria-invalid': error ? true : children.props['aria-invalid'], 'aria-describedby': [children.props['aria-describedby'], error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined }) : children}{error && <p id={`${id}-error`} className="text-sm text-destructive" role="alert">{error}</p>}</div>;
}

type SubscriberSelectProps = {
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  'data-ro-allow'?: string;
};

export function SubscriberSelect({ value, options, onValueChange, disabled, required, ...triggerProps }: SubscriberSelectProps) {
  return <Select value={value} onValueChange={(next) => onValueChange(next ?? '')} disabled={disabled} required={required}>
    <SelectTrigger {...triggerProps} className="w-full"><SelectValue /></SelectTrigger>
    <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
  </Select>;
}
export const textareaClass = 'min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring';

export interface ActionField {
  name: string;
  label: string;
  type?: 'text' | 'date' | 'money' | 'password' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox';
  required?: boolean;
  value?: string | boolean;
  options?: { value: string; label: string }[];
  min?: string;
  minLength?: number;
  placeholder?: string;
}
export interface ActionSpec {
  title: string;
  description?: string;
  fields?: ActionField[];
  destructive?: boolean;
  submit: (values: Record<string, string | boolean>, idempotencyKey: string) => Promise<void>;
}

export function ActionDialog({ action, onClose }: { action: ActionSpec | null; onClose: () => void }) {
  return action ? <ActiveActionDialog key={`${action.title}-${JSON.stringify(action.fields)}`} action={action} onClose={onClose} /> : null;
}

function ActiveActionDialog({ action, onClose }: { action: ActionSpec; onClose: () => void }) {
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
  const submitting = React.useRef(false);
  const { text, lang } = useSubscriberText();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [values, setValues] = React.useState<Record<string, string | boolean>>(() => Object.fromEntries((action.fields ?? []).map((field) => [field.name, field.value ?? (field.type === 'checkbox' ? false : '')])));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(''); setFieldErrors({});
    try {
      const normalized = { ...values };
      for (const field of action.fields ?? []) {
        if (field.type === 'money' && normalized[field.name]) normalized[field.name] = decimalMoney(String(normalized[field.name]));
      }
      await action.submit(normalized, idempotencyKey);
      onClose();
    } catch (caught) {
      const validation = subscriberValidation(caught, (action.fields ?? []).map((field) => field.name), lang);
      setFieldErrors(validation.fields); setError(validation.message);
    } finally { submitting.current = false; setBusy(false); }
  };
  return <Dialog open={Boolean(action)} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="sm:max-w-lg" showCloseButton={!busy} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <DialogHeader><DialogTitle>{action?.title}</DialogTitle><DialogDescription>{action?.description ?? text('Changes are saved only after confirmation.', 'لن يتم حفظ التغييرات إلا بعد التأكيد.')}</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <fieldset disabled={busy} className="max-h-[60vh] space-y-4 overflow-y-auto px-1">
          {action?.fields?.map((field) => <Field key={field.name} label={field.label} error={fieldErrors[field.name]}>
            {field.type === 'select' ? <SubscriberSelect value={String(values[field.name] ?? '')} options={field.options ?? []} disabled={busy} required={field.required} onValueChange={(value) => setValues({ ...values, [field.name]: value })} />
              : field.type === 'textarea' ? <textarea className={textareaClass} value={String(values[field.name] ?? '')} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />
              : field.type === 'checkbox' ? <Checkbox checked={Boolean(values[field.name])} disabled={busy} onCheckedChange={(checked) => setValues({ ...values, [field.name]: checked })} />
              : <Input placeholder={field.placeholder} type={field.type === 'money' ? 'text' : field.type ?? 'text'} inputMode={field.type === 'money' ? 'decimal' : undefined} pattern={field.type === 'money' ? '[0-9٠-٩]+([.٫][0-9٠-٩]{1,2})?' : undefined} min={field.min} minLength={field.minLength} autoComplete={field.type === 'password' ? 'new-password' : 'off'} dir={field.type === 'money' || field.type === 'tel' ? 'ltr' : undefined} value={String(values[field.name] ?? '')} required={field.required} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })} />}
          </Field>)}
        </fieldset>
        {error && <RequestError message={error} />}
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{text('Back', 'رجوع')}</Button><Button type="submit" variant={action?.destructive ? 'destructive' : 'default'} disabled={busy}>{busy ? text('Saving…', 'جارٍ الحفظ…') : text('Confirm', 'تأكيد')}</Button></div>
      </form>
    </DialogContent>
  </Dialog>;
}
