'use client';

import * as React from 'react';
import Image from 'next/image';
import { List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { optionalText, validateMenuImage, type MenuItem, type MenuSection, type PlaceMenu, type PriceSuggestion } from '@/lib/api/subscribers';
import { priceRangeLabel } from '@/lib/price-bands';
import { ActionDialog, type ActionSpec, Field, LoadingState, MoneyText, RequestError, SavedRefreshError, subscriberError, subscriberValidation, useSubscriberText } from './subscriber-ui';

export function PlaceMenuEditor({ placeId, canWrite: mayWrite, onChanged }: { placeId: string; canWrite: boolean; onChanged?: () => Promise<boolean> }) {
  const { text, pick, lang } = useSubscriberText();
  const base = `/v1/admin/places/${placeId}`;
  const load = React.useCallback(async () => {
    const result = await adminApi.get<PlaceMenu>(`${base}/menu`);
    return {
      ...result,
      sections: result.sections.map((section) => ({ ...section, nameEn: section.nameEn ?? null, sortOrder: section.sortOrder ?? 0 })),
      items: result.items.map((item) => ({ ...item, nameEn: item.nameEn ?? null, sortOrder: item.sortOrder ?? 0, updatedAt: item.updatedAt ?? '', image: item.image ?? null })),
    };
  }, [base]);
  const menu = useSubscriberResource(load);
  const loadSuggestion = React.useCallback(() => adminApi.get<PriceSuggestion>(`${base}/price-suggestion`), [base]);
  const suggestion = useSubscriberResource(loadSuggestion);
  const [action, setAction] = React.useState<ActionSpec | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [saved, setSaved] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null);
  const [imageError, setImageError] = React.useState<{ id: string; message?: string } | null>(null);
  const canWrite = mayWrite && !menu.loading && !suggestion.loading && !menu.error && !suggestion.error;
  const mutate = async (write: () => Promise<unknown>) => {
    if (!canWrite || busy) return;
    setBusy(true); setError(''); setSaved(false);
    try {
      await write();
      const results = await Promise.all([menu.refreshAfterSave(), suggestion.refreshAfterSave()]);
      const parentRefreshed = onChanged ? await onChanged() : true;
      if (results.every(Boolean) && parentRefreshed) {
        setSaved(true); toast.success(text('Pricing changes saved', 'تم حفظ تغييرات الأسعار'));
      }
    } finally { setBusy(false); }
  };
  const confirm = (title: string, description: string, write: () => Promise<unknown>) => setAction({ title, description, destructive: true, submit: async () => { await mutate(write); } });
  const sectionForm = (section?: MenuSection) => setAction({ title: section ? text('Edit group', 'تعديل المجموعة') : text('Add group', 'إضافة مجموعة'), fields: [
    { name: 'nameAr', label: text('Arabic name', 'الاسم بالعربية'), value: section?.nameAr ?? '', required: true },
    { name: 'nameEn', label: text('English name (optional)', 'الاسم بالإنجليزية (اختياري)'), value: section?.nameEn ?? '' },
  ], submit: async (values, idempotencyKey) => { await mutate(() => section ? adminApi.patch<MenuSection>(`/v1/admin/menu/sections/${section.id}`, { ...values, nameEn: optionalText(values.nameEn) }) : adminApi.post<MenuSection>(`${base}/menu/sections`, { ...values, nameEn: optionalText(values.nameEn) }, { headers: { 'Idempotency-Key': idempotencyKey } })); } });
  const itemForm = (item?: MenuItem, sectionId?: string | null) => setAction({ title: item ? text('Edit item or service', 'تعديل الصنف أو الخدمة') : text('Add item or service', 'إضافة صنف أو خدمة'), fields: [
    { name: 'nameAr', label: text('Arabic name', 'الاسم بالعربية'), value: item?.nameAr ?? '', required: true, placeholder: text('e.g. Sunset boat trip or Turkish coffee', 'مثلاً: رحلة قارب عند الغروب أو قهوة تركية') },
    { name: 'nameEn', label: text('English name (optional)', 'الاسم بالإنجليزية (اختياري)'), value: item?.nameEn ?? '', placeholder: 'e.g. Sunset boat trip or Turkish coffee' },
    { name: 'price', label: text('Price (EGP)', 'السعر (جنيه)'), type: 'money', value: item?.price ?? '', required: true },
    { name: 'sectionId', label: text('Group', 'مجموعة'), type: 'select', value: item?.sectionId ?? sectionId ?? '', options: [{ value: '', label: text('Ungrouped', 'بدون مجموعة') }, ...(menu.data?.sections ?? []).map((entry) => ({ value: entry.id, label: pick(entry.nameAr, entry.nameEn) }))] },
    { name: 'available', label: text('Available', 'متاح'), type: 'checkbox', value: item?.available ?? true },
    { name: 'hidden', label: text('Hidden from public pricing', 'مخفي من الأسعار العامة'), type: 'checkbox', value: item?.hidden ?? false },
  ], submit: async (values, idempotencyKey) => {
    const body = { ...values, nameEn: optionalText(values.nameEn), sectionId: values.sectionId || null };
    await mutate(() => item ? adminApi.patch<MenuItem>(`/v1/admin/menu/items/${item.id}`, body) : adminApi.post<MenuItem>(`${base}/menu/items`, body, { headers: { 'Idempotency-Key': idempotencyKey } }));
  } });
  const groups = menu.data ? [{ id: null, nameAr: 'بدون مجموعة', nameEn: 'Ungrouped', sortOrder: -1 }, ...menu.data.sections.slice().sort((first, second) => first.sortOrder - second.sortOrder)] : [];
  return <div className="space-y-5" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><List className="size-4" aria-hidden="true" />{text('Pricing', 'الأسعار')}</CardTitle><CardDescription className="mt-1">{text('Manage groups, items or services, prices and visibility.', 'إدارة المجموعات والأصناف أو الخدمات والأسعار والظهور.')}</CardDescription></div>{canWrite && <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || !menu.data || Boolean(menu.error) || menu.loading} onClick={() => sectionForm()}>{text('Add group', 'إضافة مجموعة')}</Button><Button disabled={busy || !menu.data || Boolean(menu.error) || menu.loading} onClick={() => itemForm()}>{text('Add item or service', 'إضافة صنف أو خدمة')}</Button></div>}</CardHeader><CardContent className="space-y-5">
      {menu.loading && <LoadingState />}{menu.error && (menu.savedRefreshFailed ? <SavedRefreshError retry={() => { void menu.refetch(); }} /> : <RequestError message={subscriberError(menu.error, lang)} retry={() => { void menu.refetch(); }} />)}
      {menu.data && !menu.error && <><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-4"><div><p className="font-medium">{menu.data.hidden ? text('Pricing hidden', 'الأسعار مخفية') : text('Pricing visible', 'الأسعار ظاهرة')}</p><p className="mt-1 text-sm text-muted-foreground">{text('Edits go live immediately. Hidden items and services are not public; unavailable ones stay visible.', 'تظهر التعديلات فوراً. الأصناف والخدمات المخفية ليست عامة، وغير المتاحة تبقى ظاهرة.')}</p></div>{canWrite && <Button role="switch" aria-checked={menu.data.hidden} aria-label={text('Hide pricing', 'إخفاء الأسعار')} variant="outline" disabled={busy || menu.loading} onClick={() => setAction({ title: menu.data?.hidden ? text('Show pricing?', 'إظهار الأسعار؟') : text('Hide pricing?', 'إخفاء الأسعار؟'), description: text('This changes visibility for all visitors.', 'يغير هذا الإجراء ظهور الأسعار لجميع الزوار.'), destructive: !menu.data?.hidden, submit: async () => { await mutate(() => adminApi.patch(`${base}/menu`, { hidden: !menu.data?.hidden })); } })}>{menu.data.hidden ? text('Show pricing', 'إظهار الأسعار') : text('Hide pricing', 'إخفاء الأسعار')}</Button>}</div>
        {!menu.data.items.length && <p className="py-4 text-sm text-muted-foreground">{text('No items or services yet. Add a group, then its first item or service.', 'لا توجد أصناف أو خدمات بعد. أضف مجموعة ثم أول صنف أو خدمة فيها.')}</p>}
        {groups.map((section) => {
          const items = menu.data!.items.filter((item) => item.sectionId === section.id).sort((first, second) => first.sortOrder - second.sortOrder);
          if (section.id === null && !items.length) return null;
          return <section key={section.id ?? 'unsectioned'} className="space-y-3 border-t pt-4"><header className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{pick(section.nameAr, section.nameEn)} <span className="text-sm font-normal text-muted-foreground">({items.length})</span></h3>{canWrite && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => itemForm(undefined, section.id)}>{text('Add item or service', 'إضافة صنف أو خدمة')}</Button>{section.id && <><Button size="sm" variant="ghost" disabled={busy} onClick={() => sectionForm(section as MenuSection)}>{text('Edit group', 'تعديل المجموعة')}</Button><Button size="sm" variant="destructive" disabled={busy} onClick={() => confirm(text('Delete group?', 'حذف المجموعة؟'), text('Its items and services will move to Ungrouped. They will not be deleted.', 'ستنتقل أصنافه وخدماته إلى بدون مجموعة، ولن تُحذف.'), () => adminApi.delete(`/v1/admin/menu/sections/${section.id}`))}>{text('Delete group', 'حذف المجموعة')}</Button></>}</div>}</header>
            {!items.length && <p className="text-sm text-muted-foreground">{text('This group has no items or services.', 'لا توجد أصناف أو خدمات في هذه المجموعة.')}</p>}
            <ul className="divide-y">{items.map((item) => <li key={item.id} className="flex flex-col gap-4 py-4 sm:flex-row"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-medium">{pick(item.nameAr, item.nameEn)}</h4>{item.hidden && <Badge variant="secondary">{text('Hidden', 'مخفي')}</Badge>}{!item.available && <Badge variant="secondary">{text('Unavailable', 'غير متاح')}</Badge>}</div><p className="mt-1 text-sm"><MoneyText value={item.price} /></p>{item.image && <Image src={item.image.small ?? item.image.url} alt={pick(item.nameAr, item.nameEn)} width={160} height={120} unoptimized className="mt-3 aspect-video rounded-lg object-cover" />}</div>{canWrite && <div className="space-y-2 sm:max-w-xs"><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => itemForm(item)}>{text('Edit', 'تعديل')}</Button><Button size="sm" variant="destructive" disabled={busy} onClick={() => confirm(text('Delete item or service?', 'حذف الصنف أو الخدمة؟'), text('The item or service will be removed from the public pricing.', 'سيُزال الصنف أو الخدمة من الأسعار العامة.'), () => adminApi.delete(`/v1/admin/menu/items/${item.id}`))}>{text('Delete', 'حذف')}</Button>{item.image && <Button size="sm" variant="outline" disabled={busy} onClick={() => confirm(text('Remove image?', 'إزالة الصورة؟'), text('The item or service remains on the pricing without an image.', 'يبقى الصنف أو الخدمة في الأسعار بدون صورة.'), () => adminApi.delete(`/v1/admin/menu/items/${item.id}/image`))}>{text('Remove image', 'إزالة الصورة')}</Button>}</div><Field label={item.image ? text('Replace image', 'استبدال الصورة') : text('Upload one image', 'رفع صورة واحدة')} error={imageError?.id === item.id ? imageError.message : undefined}><Input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} className="block w-full rounded-lg border border-input p-2 text-sm file:me-2 file:border-0 file:bg-muted file:p-2 focus-visible:ring-2 focus-visible:ring-ring" onChange={async (event) => {
                const file = event.target.files?.[0]; event.target.value = '';
                if (!file || !canWrite) return;
                setSaved(false); setError(''); setImageError(null); setUploadProgress(null);
                try {
                  validateMenuImage(file);
                  const form = new FormData(); form.append('file', file);
                  setUploadProgress(0);
                  await mutate(() => adminApi.uploadWithProgress(`/v1/admin/menu/items/${item.id}/image`, form, setUploadProgress, 'PUT'));
                } catch (caught) {
                  const validation = subscriberValidation(caught, ['file'], lang);
                  setImageError({ id: item.id, message: validation.fields.file }); setError(validation.message);
                } finally { setUploadProgress(null); }
              }} /></Field></div>}</li>)}</ul>
          </section>;
        })}
      </>}{error && <RequestError message={error} />}{uploadProgress !== null && <div role="status" className="space-y-1"><p className="text-sm">{text('Uploading image', 'جارٍ رفع الصورة')} · {uploadProgress}%</p><progress max={100} value={uploadProgress} aria-label={text('Image upload progress', 'تقدم رفع الصورة')} className="h-2 w-full" /></div>}{busy && uploadProgress === null && <p role="status" className="text-sm">{text('Saving…', 'جارٍ الحفظ…')}</p>}{saved && <p role="status" className="text-sm text-success">{text('Pricing changes saved.', 'تم حفظ تغييرات الأسعار.')}</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>{text('Price suggestion and price match', 'اقتراح السعر ومطابقة الأسعار')}</CardTitle><CardDescription>{text("Reviewed by the 5argny team: the prices listed match the place's real prices.", 'راجعها فريق خرجني: الأسعار المعروضة مطابقة لأسعار المكان الفعلية.')}</CardDescription></CardHeader><CardContent className="space-y-4">{suggestion.loading && <LoadingState />}{suggestion.error && (suggestion.savedRefreshFailed ? <SavedRefreshError retry={() => { void suggestion.refetch(); }} /> : <RequestError message={subscriberError(suggestion.error, lang)} retry={() => { void suggestion.refetch(); }} />)}{suggestion.data && !suggestion.error && <><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">{text('Current band per person', 'الفئة الحالية للفرد')}</dt><dd className="mt-1 font-medium">{priceRangeLabel(suggestion.data.currentLevel, lang)}</dd></div><div><dt className="text-sm text-muted-foreground">{text('Suggested band per person', 'الفئة المقترحة للفرد')}</dt><dd className="mt-1 font-medium">{priceRangeLabel(suggestion.data.suggestedLevel, lang)}</dd></div><div><dt className="text-sm text-muted-foreground">{text('Median item or service price', 'وسيط سعر الصنف أو الخدمة')}</dt><dd>{suggestion.data.medianPrice === null ? text('Not available', 'غير متاح') : <MoneyText value={suggestion.data.medianPrice} />}</dd></div><div><dt className="text-sm text-muted-foreground">{text('Items and services considered', 'عدد الأصناف والخدمات المحتسبة')}</dt><dd className="tabular-nums">{suggestion.data.itemCount}</dd></div></dl><p className="text-sm text-muted-foreground">{text('The suggestion does not change the price band. Update the band in Edit place after checking the pricing.', 'الاقتراح لا يغير فئة السعر. عدّل الفئة في تعديل المكان بعد مراجعة الأسعار.')}</p><div className="flex flex-wrap items-center gap-3"><Badge variant={suggestion.data.verified ? 'default' : 'secondary'}>{suggestion.data.verified ? text('Price match confirmed', 'تم تأكيد المطابقة') : text('Not confirmed', 'لم تُؤكَّد')}</Badge>{canWrite && <Button role="switch" aria-checked={suggestion.data.verified} aria-label={text('Price match', 'مطابقة الأسعار')} variant="outline" disabled={busy || suggestion.loading} onClick={async () => { try { await mutate(() => adminApi.put(`${base}/price-verification`, { verified: !suggestion.data?.verified })); } catch (caught) { setError(subscriberError(caught, lang)); } }}>{suggestion.data.verified ? text('Remove price match confirmation', 'إلغاء تأكيد مطابقة الأسعار') : text('Confirm price match', 'تأكيد مطابقة الأسعار')}</Button>}</div>{suggestion.data.verifiedAt && <p className="break-words text-sm text-muted-foreground">{text('Price match confirmed at', 'تم تأكيد المطابقة في')} {suggestion.data.verifiedAt} · {suggestion.data.verifiedBy?.email}</p>}</>}</CardContent></Card>
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div>;
}
