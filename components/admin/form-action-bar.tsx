'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useDashboardLang } from '@/lib/dashboard-lang';
import { DashboardText } from './dashboard-text';

type BarLink = { label: string; href: string };
const NavigationContext = React.createContext<BarLink[]>([]);

export function ActionBarNavigation({ links, children, fallback = false }: { links: BarLink[]; children: React.ReactNode; fallback?: boolean }) {
  return <NavigationContext.Provider value={links}>{children}{fallback && links.length > 0 && <FormActionBar dirty={false} saving={false}><></></FormActionBar>}</NavigationContext.Provider>;
}

export function FormActionBar({ dirty, saving, error, disabled, disabledReason, form, onSave, cancelHref, onCancel, primaryLabel, traceId, creating = false, active = true, children, extraActions }: {
  children?: React.ReactNode;
  extraActions?: React.ReactNode;
  active?: boolean;
  creating?: boolean;
  dirty: boolean;
  saving: boolean;
  error?: string | null;
  disabled?: boolean;
  disabledReason?: string;
  form?: string;
  onSave?: () => void;
  cancelHref?: string;
  onCancel?: () => void;
  primaryLabel?: string;
  traceId?: string;
}) {
  const { lang } = useDashboardLang();
  const navigation = React.useContext(NavigationContext);
  const reasonId = React.useId();
  const bar = React.useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = React.useState<{ left: number; width: number } | null>(null);
  React.useEffect(() => {
    const element = bar.current;
    const main = element?.closest('main');
    if (!element || !main) return;
    const measure = () => {
      const rect = main.getBoundingClientRect();
      setBounds({ left: rect.left, width: rect.width });
      const height = element.getBoundingClientRect().height;
      if (height) main.style.setProperty('--form-action-height', `${height}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(main);
    observer.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  const text = (english: string, arabic: string) => lang === 'ar' ? arabic : english;
  const message = saving ? text('Saving…', 'جارٍ الحفظ…') : error || disabledReason || (dirty ? text('Unsaved changes', 'تغييرات غير محفوظة') : creating ? text('Not saved yet', 'لم يُحفظ بعد') : text('Saved', 'محفوظ'));
  return <div ref={bar} hidden={!active} data-slot="form-action-bar" dir={lang === 'ar' ? 'rtl' : 'ltr'}
    className="sticky bottom-0 z-40 mt-6 border-t border-border bg-background/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6 lg:px-8"
    style={bounds ? { position: 'fixed', left: bounds.left, width: bounds.width, marginTop: 0 } : undefined}>
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      {navigation.map(link => <Button key={link.href} type="button" variant="outline" data-ro-allow="true" nativeButton={false} render={<Link href={link.href} />}><DashboardText>{link.label}</DashboardText></Button>)}
      {extraActions}
      {children ? <div className="ms-auto flex flex-wrap items-center gap-3">{children}</div> : <>
      <p id={reasonId} role={error ? 'alert' : 'status'} className={`min-w-0 flex-1 basis-full break-words text-sm sm:basis-auto ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</p>
      <Button type={onSave ? 'button' : 'submit'} form={form} onClick={onSave} disabled={!dirty || saving || disabled} aria-describedby={disabledReason ? reasonId : undefined} title={disabledReason} data-trace-id={traceId}>
        {saving ? text('Saving…', 'جارٍ الحفظ…') : primaryLabel ?? text('Save changes', 'حفظ التغييرات')}
      </Button>
      {cancelHref ? <Button type="button" variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>{text('Cancel', 'إلغاء')}</Button> :
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>{text('Back', 'رجوع')}</Button>}
      </>}
    </div>
  </div>;
}
