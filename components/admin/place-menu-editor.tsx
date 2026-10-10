'use client';

import { PageActions } from './page-actions';
import * as React from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { RecordCell, RecordThumbnail } from './record-cell';
import { RecordList } from './record-list';
import { ImageOff, List, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { adminApi } from '@/lib/api/admin-client';
import { useSubscriberResource } from '@/lib/api/hooks/use-subscriber-resource';
import { optionalText, validateMenuImage, type MenuItem, type MenuSection, type PlaceMenu, type PriceSuggestion } from '@/lib/api/subscribers';
import { priceBandLabel } from '@/lib/price-bands';
import { StatusBadge, ActionDialog, type ActionSpec, LoadingState, MoneyText, RequestError, SavedRefreshError, subscriberError, subscriberValidation, useSubscriberText } from './subscriber-ui';

function MenuRowAction({ label, disabled, destructive, onClick, children }: { label: string; disabled: boolean; destructive?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Tooltip><TooltipTrigger render={<Button type="button" variant="ghost" size="icon-sm" className={destructive ? 'hover:text-destructive focus-visible:text-destructive' : undefined} disabled={disabled} aria-label={label} title={label} onClick={onClick}>{children}</Button>} /><TooltipContent>{label}</TooltipContent></Tooltip>;
}

export function PlaceMenuEditor({ placeId, canWrite: mayWrite, onChanged, primaryAction = true }: { placeId: string; canWrite: boolean; onChanged?: () => Promise<boolean>; primaryAction?: boolean }) {
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
  const [imageUploadId, setImageUploadId] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<{ id: string; message?: string } | null>(null);
  const imageHelp = text('JPEG, PNG or WebP, up to 5 MB', 'JPEG أو PNG أو WebP، حتى 5 ميجابايت');
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
  return <TooltipProvider><div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <Card><CardHeader className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle className="flex items-center gap-2 font-semibold"><List className="size-4" aria-hidden="true" />{text('Pricing', 'الأسعار')}</CardTitle><CardDescription className="mt-1">{text('Manage groups, items or services, prices and visibility.', 'إدارة المجموعات والأصناف أو الخدمات والأسعار والظهور.')}{' '}{imageHelp}.</CardDescription></div><PageActions form={!primaryAction} actions={[{ label: 'Add item or service', allowed: canWrite, disabled: busy || !menu.data || Boolean(menu.error) || menu.loading, onClick: () => itemForm() }, { label: 'Add group', allowed: canWrite, disabled: busy || !menu.data || Boolean(menu.error) || menu.loading, onClick: () => sectionForm() }]} /></CardHeader><CardContent className="space-y-5">
      {menu.loading && <LoadingState />}{menu.error && (menu.savedRefreshFailed ? <SavedRefreshError retry={() => { void menu.refetch(); }} /> : <RequestError message={subscriberError(menu.error, lang)} retry={() => { void menu.refetch(); }} />)}
      {menu.data && !menu.error && <><div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted p-4"><div><p className="font-medium">{menu.data.hidden ? text('Pricing hidden', 'الأسعار مخفية') : text('Pricing visible', 'الأسعار ظاهرة')}</p><p className="mt-1 text-sm text-muted-foreground">{text('Edits go live immediately. Hidden items and services are not public; unavailable ones stay visible.', 'تظهر التعديلات فوراً. الأصناف والخدمات المخفية ليست عامة، وغير المتاحة تبقى ظاهرة.')}</p></div>{canWrite && <Button role="switch" aria-checked={menu.data.hidden} aria-label={text('Hide pricing', 'إخفاء الأسعار')} variant="outline" disabled={busy || menu.loading} onClick={() => setAction({ title: menu.data?.hidden ? text('Show pricing?', 'إظهار الأسعار؟') : text('Hide pricing?', 'إخفاء الأسعار؟'), description: text('This changes visibility for all visitors.', 'يغير هذا الإجراء ظهور الأسعار لجميع الزوار.'), destructive: !menu.data?.hidden, submit: async () => { await mutate(() => adminApi.patch(`${base}/menu`, { hidden: !menu.data?.hidden })); } })}>{menu.data.hidden ? text('Show pricing', 'إظهار الأسعار') : text('Hide pricing', 'إخفاء الأسعار')}</Button>}</div>
        {!menu.data.items.length && <p className="py-4 text-sm text-muted-foreground">{text('No items or services yet. Add a group, then its first item or service.', 'لا توجد أصناف أو خدمات بعد. أضف مجموعة ثم أول صنف أو خدمة فيها.')}</p>}
      </>}{error && !imageError && <RequestError message={error} />}{busy && uploadProgress === null && <p role="status" className="text-sm">{text('Saving…', 'جارٍ الحفظ…')}</p>}{saved && <p role="status" className="text-sm text-success">{text('Pricing changes saved.', 'تم حفظ تغييرات الأسعار.')}</p>}
    </CardContent></Card>
        {menu.data && !menu.error && <RecordList layout="groups" scope="pricing-groups" records={groups.filter((section) => section.id !== null || menu.data!.items.some((item) => item.sectionId === null))} searchText={(section) => `${section.nameAr} ${section.nameEn ?? ''}`} render={(visibleGroups) => <div className="space-y-6">{visibleGroups.map((section) => {
          const items = menu.data!.items.filter((item) => item.sectionId === section.id).sort((first, second) => first.sortOrder - second.sortOrder);
          if (section.id === null && !items.length) return null;
          const groupKey = section.id ?? 'unsectioned';
          return <Card key={groupKey} data-slot="pricing-group" data-group-id={groupKey} className="gap-4 border border-border"><CardHeader className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="flex min-w-0 items-center gap-2 text-base font-semibold"><RecordCell icon="section" nameAr={section.nameAr} nameEn={section.nameEn} /> <span className="text-xs font-normal tabular-nums text-muted-foreground">({items.length})</span></CardTitle>{canWrite && <div className="flex flex-wrap gap-3"><Button size="sm" className="min-h-10 whitespace-normal text-sm" variant="outline" disabled={busy} onClick={() => itemForm(undefined, section.id)}>{text('Add item or service', 'إضافة صنف أو خدمة')}</Button>{section.id && <><Button size="sm" className="min-h-10 whitespace-normal text-sm" variant="ghost" disabled={busy} onClick={() => sectionForm(section as MenuSection)}>{text('Edit group', 'تعديل المجموعة')}</Button><Button size="sm" className="min-h-10 whitespace-normal text-sm hover:text-destructive focus-visible:text-destructive" variant="ghost" disabled={busy} onClick={() => confirm(text('Delete group?', 'حذف المجموعة؟'), text('Its items and services will move to Ungrouped. They will not be deleted.', 'ستنتقل أصنافه وخدماته إلى بدون مجموعة، ولن تُحذف.'), () => adminApi.delete(`/v1/admin/menu/sections/${section.id}`))}>{text('Delete group', 'حذف المجموعة')}</Button></>}</div>}</CardHeader><CardContent className="min-w-0 space-y-4">
            {!items.length && <p className="text-sm text-muted-foreground">{text('This group has no items or services.', 'لا توجد أصناف أو خدمات في هذه المجموعة.')}</p>}
            <RecordList scope={`pricing-${groupKey}`} records={items} searchText={(item) => `${item.nameAr} ${item.nameEn ?? ''}`} filters={[{ key: 'visibility', label: 'All statuses', options: [{ value: 'visible', label: 'Visible' }, { value: 'hidden', label: 'Hidden' }], value: (item) => item.hidden ? 'hidden' : 'visible' }]} render={(visibleItems) => <ul tabIndex={0} aria-label={text('Pricing items and services', 'أصناف وخدمات الأسعار')} className="divide-y divide-border overflow-x-auto focus-visible:outline-2 focus-visible:outline-ring">{visibleItems.map((item) => <li key={item.id} data-slot="pricing-item" data-item-id={item.id} className="grid min-h-16 grid-cols-1 sm:grid-cols-[3rem_minmax(0,1fr)_7rem_6rem_8.5rem] items-center gap-3 py-1.5 hover:bg-muted/40 focus-within:bg-muted/40 dark:hover:bg-background/30 dark:focus-within:bg-background/30">
              <div className="min-w-0">
                {!canWrite && <RecordThumbnail src={item.image?.small ?? item.image?.url} size={48} />}
                {canWrite && <FileUpload compact thumbnail={{ src: item.image?.small ?? item.image?.url, replace: Boolean(item.image) }} label={item.image ? text('Replace the photo of ', 'استبدال صورة ') + pick(item.nameAr, item.nameEn) : text('Upload a photo for ', 'رفع صورة لـ ') + pick(item.nameAr, item.nameEn)} description={imageHelp} accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async (event) => {
                const file = event.target.files?.[0]; event.target.value = '';
                if (!file || !canWrite) return;
                setSaved(false); setError(''); setImageError(null); setUploadProgress(null); setImageUploadId(item.id);
                try {
                  validateMenuImage(file);
                  const form = new FormData(); form.append('file', file);
                  setUploadProgress(0);
                  await mutate(() => adminApi.uploadWithProgress(`/v1/admin/menu/items/${item.id}/image`, form, setUploadProgress, 'PUT'));
                } catch (caught) {
                  const validation = subscriberValidation(caught, ['file'], lang);
                  setImageError({ id: item.id, message: validation.fields.file ?? validation.message }); setError(validation.message);
                } finally { setUploadProgress(null); setImageUploadId(null); }
              }} />}
              </div>
              <div className="min-w-0"><RecordCell icon="section" nameAr={item.nameAr} nameEn={item.nameEn} />{imageUploadId === item.id && uploadProgress !== null && <div role="status"><p className="truncate text-xs leading-4 tabular-nums">{text('Uploading image', 'جارٍ رفع الصورة')} · {uploadProgress}%</p><progress max={100} value={uploadProgress} aria-label={text('Image upload progress', 'تقدم رفع الصورة')} className="sr-only" /></div>}{imageError?.id === item.id && imageError.message && <p role="alert" className="truncate text-xs leading-4 text-destructive" title={imageError.message}>{imageError.message}</p>}</div>
              <div className="flex flex-wrap gap-1">{item.hidden && <StatusBadge status="disabled">{text('Hidden', 'مخفي')}</StatusBadge>}{!item.available && <StatusBadge status="disabled">{text('Unavailable', 'غير متاح')}</StatusBadge>}</div>
              <p className="text-end text-sm tabular-nums"><MoneyText value={item.price} mutedUnit /></p>
              {canWrite && <div className="flex justify-end gap-2">
                <MenuRowAction disabled={busy} label={text('Edit', 'تعديل') + ' ' + pick(item.nameAr, item.nameEn)} onClick={() => itemForm(item)}><Pencil className="size-4" aria-hidden="true" /></MenuRowAction>
                <MenuRowAction disabled={busy} destructive label={text('Delete', 'حذف') + ' ' + pick(item.nameAr, item.nameEn)} onClick={() => confirm(text('Delete item or service?', 'حذف الصنف أو الخدمة؟'), text('The item or service will be removed from the public pricing.', 'سيُزال الصنف أو الخدمة من الأسعار العامة.'), () => adminApi.delete(`/v1/admin/menu/items/${item.id}`))}><Trash2 className="size-4" aria-hidden="true" /></MenuRowAction>
                {item.image && <MenuRowAction disabled={busy} label={text('Remove image', 'إزالة الصورة') + ' ' + pick(item.nameAr, item.nameEn)} onClick={() => confirm(text('Remove image?', 'إزالة الصورة؟'), text('The item or service remains on the pricing without an image.', 'يبقى الصنف أو الخدمة في الأسعار بدون صورة.'), () => adminApi.delete(`/v1/admin/menu/items/${item.id}/image`))}><ImageOff className="size-4" aria-hidden="true" /></MenuRowAction>}
              </div>}
            </li>)}</ul>} />
          </CardContent></Card>;
        })}</div>} />}
    <Card><CardHeader><CardTitle>{text('Price suggestion and price match', 'اقتراح السعر ومطابقة الأسعار')}</CardTitle><CardDescription>{text("Reviewed by the 5argny team: the prices listed match the place's real prices.", 'راجعها فريق خرجني: الأسعار المعروضة مطابقة لأسعار المكان الفعلية.')}</CardDescription></CardHeader><CardContent className="space-y-4">{suggestion.loading && <LoadingState />}{suggestion.error && (suggestion.savedRefreshFailed ? <SavedRefreshError retry={() => { void suggestion.refetch(); }} /> : <RequestError message={subscriberError(suggestion.error, lang)} retry={() => { void suggestion.refetch(); }} />)}{suggestion.data && !suggestion.error && <><dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">{text('Current band per person', 'الفئة الحالية للفرد')}</dt><dd className="mt-1 font-medium">{priceBandLabel(suggestion.data.currentLevel, lang)}</dd></div><div><dt className="text-sm text-muted-foreground">{text('Suggested band per person', 'الفئة المقترحة للفرد')}</dt><dd className="mt-1 font-medium">{priceBandLabel(suggestion.data.suggestedLevel, lang)}</dd></div><div><dt className="text-sm text-muted-foreground">{text('Median item or service price', 'وسيط سعر الصنف أو الخدمة')}</dt><dd>{suggestion.data.medianPrice === null ? text('Not available', 'غير متاح') : <MoneyText value={suggestion.data.medianPrice} />}</dd></div><div><dt className="text-sm text-muted-foreground">{text('Items and services considered', 'عدد الأصناف والخدمات المحتسبة')}</dt><dd className="tabular-nums">{suggestion.data.itemCount}</dd></div></dl><p className="text-sm text-muted-foreground">{text('The suggestion does not change the price band. Update the band in Edit place after checking the pricing.', 'الاقتراح لا يغير فئة السعر. عدّل الفئة في تعديل المكان بعد مراجعة الأسعار.')}</p><div className="flex flex-wrap items-center gap-3"><StatusBadge status={suggestion.data.verified ? 'active' : 'draft'}>{suggestion.data.verified ? text('Price match confirmed', 'تم تأكيد المطابقة') : text('Not confirmed', 'لم تُؤكَّد')}</StatusBadge>{canWrite && <Button role="switch" aria-checked={suggestion.data.verified} aria-label={text('Price match', 'مطابقة الأسعار')} variant="outline" disabled={busy || suggestion.loading} onClick={async () => { try { await mutate(() => adminApi.put(`${base}/price-verification`, { verified: !suggestion.data?.verified })); } catch (caught) { setError(subscriberError(caught, lang)); } }}>{suggestion.data.verified ? text('Remove price match confirmation', 'إلغاء تأكيد مطابقة الأسعار') : text('Confirm price match', 'تأكيد مطابقة الأسعار')}</Button>}</div>{suggestion.data.verifiedAt && <p className="break-words text-sm text-muted-foreground">{text('Price match confirmed at', 'تم تأكيد المطابقة في')} {suggestion.data.verifiedAt} · {suggestion.data.verifiedBy?.email}</p>}</>}</CardContent></Card>
    <ActionDialog action={action} onClose={() => setAction(null)} />
  </div></TooltipProvider>;
}
