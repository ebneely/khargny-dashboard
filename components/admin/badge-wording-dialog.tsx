'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BadgeIcon } from './badge-icon';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AdminApiError } from '@/lib/api/admin-client';
import { badgesApi, type ManagedBadge, type BadgeIconKey } from '@/lib/api/badges';
import { useDashboardCopy } from './dashboard-text';
import { Field, RequestError, SubscriberSelect, textareaClass, useSubscriberText } from './subscriber-ui';

export function BadgeWordingDialog({ badge, canWrite, refresh, onClose }: { badge: ManagedBadge; canWrite: boolean; refresh: () => Promise<boolean>; onClose: () => void }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const [draft, setDraft] = React.useState({ nameAr: badge.nameAr, nameEn: badge.nameEn, descriptionAr: badge.descriptionAr, descriptionEn: badge.descriptionEn, icon: badge.icon, sortOrder: String(badge.sortOrder) });
  const [busy, setBusy] = React.useState(false);
  const writing = React.useRef(false);
  const [error, setError] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  if (!canWrite) return null;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canWrite || writing.current) return;
    const invalid = Object.fromEntries((['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn'] as const).filter((field) => !draft[field].trim() || draft[field].length > (field.startsWith('description') ? 1000 : 200)).map((field) => [field, copy('Use nonblank names up to 200 characters and descriptions up to 1000 characters.')]));
    if (!/^\d+$/.test(draft.sortOrder) || Number(draft.sortOrder) > 10000) invalid.sortOrder = copy('Enter a valid display order (0–10000).');
    setErrors(invalid); if (Object.keys(invalid).length) return;
    writing.current = true; setBusy(true); setError('');
    try { await badgesApi.update(badge.key, { ...draft, sortOrder: Number(draft.sortOrder) }); toast.success(copy('Saved')); await refresh(); onClose(); }
    catch (caught) { setErrors(caught instanceof AdminApiError ? caught.fields : {}); setError(copy('Could not save this badge. Try again.')); }
    finally { writing.current = false; setBusy(false); }
  };
  const labels = { nameAr: 'Arabic name', nameEn: 'English name', descriptionAr: 'Arabic description', descriptionEn: 'English description' };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent dir={lang === 'ar' ? 'rtl' : 'ltr'} showCloseButton={!busy}><DialogHeader><DialogTitle>{copy('Edit wording')}</DialogTitle><DialogDescription>{copy('Changes are live at once')}</DialogDescription></DialogHeader>
    <form onSubmit={save} className="space-y-4"><fieldset disabled={busy} className="max-h-[60vh] space-y-4 overflow-y-auto px-1">{(Object.keys(labels) as (keyof typeof labels)[]).map((field) => <Field key={field} label={copy(labels[field])} error={errors[field]} required>{field.startsWith('description') ? <textarea required maxLength={1000} dir={field.endsWith('Ar') ? 'rtl' : 'ltr'} className={textareaClass} value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} /> : <Input required maxLength={200} dir={field.endsWith('Ar') ? 'rtl' : 'ltr'} value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} />}</Field>)}
      <Field label={copy('Badge icon')} error={errors.icon}><SubscriberSelect value={draft.icon} disabled={busy} onValueChange={(icon) => setDraft({ ...draft, icon: icon as BadgeIconKey })} options={['tag', 'price-check', 'mark', 'flame', 'heart', 'eye'].map((value, index) => ({ value, label: copy(['Tag icon', 'Price check icon', 'Visit mark icon', 'Flame icon', 'Heart icon', 'Eye icon'][index]) }))} /></Field>
      <Field label={copy('Display order')} error={errors.sortOrder}><Input inputMode="numeric" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} /></Field></fieldset>
      <section className="min-w-0 space-y-3 rounded-lg bg-muted p-4"><h3 className="text-sm font-medium">{copy('Badge and legend preview')}</h3>{(['ar', 'en'] as const).map((language) => <div key={language} dir={language === 'ar' ? 'rtl' : 'ltr'} className="min-w-0 space-y-2 break-words"><Badge variant="secondary"><BadgeIcon icon={draft.icon} />{language === 'ar' ? draft.nameAr : draft.nameEn}</Badge><p className="text-sm text-muted-foreground">{language === 'ar' ? draft.descriptionAr : draft.descriptionEn}</p></div>)}</section>
      {error && <RequestError message={error} />}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{copy('Back')}</Button><Button type="submit" disabled={busy}>{copy(busy ? 'Saving…' : 'Save wording')}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
