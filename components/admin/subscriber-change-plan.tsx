'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { plansApi, type ChangePlanResult, type PlanKey } from '@/lib/api/plans';
import type { Subscription } from '@/lib/api/subscribers';
import { usePlanCatalogue } from '@/lib/api/hooks/use-plan-catalogue';
import { changePlanRequest, planMoneyLabel } from '@/lib/subscription-plans';
import { useDashboardCopy } from './dashboard-text';
import { PlanChip, PlanChoices, PromotionNote } from './plan-choices';
import { LoadingState, MoneyText, RequestError, subscriberError, useSubscriberText } from './subscriber-ui';

export function SubscriberChangePlan(props: { subscription: Subscription; canWrite: boolean; refresh: () => Promise<boolean>; onClose: () => void }) {
  return props.canWrite ? <ChangePlanForm {...props} /> : null;
}
function ChangePlanForm({ subscription, canWrite, refresh, onClose }: { subscription: Subscription; canWrite: boolean; refresh: () => Promise<boolean>; onClose: () => void }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const catalogue = usePlanCatalogue();
  const current = subscription.plan ?? 'owner';
  const [target, setTarget] = React.useState<PlanKey>(current === 'owner' ? 'owner_plus' : 'owner');
  const [busy, setBusy] = React.useState(false);
  const writing = React.useRef(false);
  const [result, setResult] = React.useState<ChangePlanResult | null>(null);
  const [error, setError] = React.useState('');
  const [refreshFailed, setRefreshFailed] = React.useState(false);
  const confirm = async () => {
    if (!canWrite || writing.current || result || target === current || !catalogue.data?.plans.some((row) => row.plan === target && row.active)) return;
    writing.current = true; setBusy(true); setError('');
    try {
      const changed = await plansApi.change(subscription.id, changePlanRequest(target));
      setResult(changed); toast.success(copy('Plan changed'));
      setRefreshFailed(!await refresh());
    } catch (caught) { setError(subscriberError(caught, lang)); }
    finally { writing.current = false; setBusy(false); }
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent dir={lang === 'ar' ? 'rtl' : 'ltr'} showCloseButton={!busy}>
    <DialogHeader><DialogTitle>{copy(result ? 'Plan changed' : 'Change plan')}</DialogTitle><DialogDescription>{copy('This closes the current period now and links a new period ending on the same date. Recorded payments stay on the old period.')}</DialogDescription></DialogHeader>
    {result ? <div className="space-y-4"><p className="flex flex-wrap items-center gap-2"><PlanChip plan={result.previous.plan} /><span>→</span><PlanChip plan={result.current.plan} /></p>
      <p role="status" className="text-sm">{copy('Server-computed difference')}: <MoneyText value={planMoneyLabel(result.difference.amount, lang)} /> {copy('for the remaining')} {result.difference.daysLeft.toLocaleString(lang)} {copy('days')}. {copy(result.difference.credit ? 'Credit; no automatic refund.' : 'No payment recorded.')}</p>
      {refreshFailed && <RequestError message={copy('Saved, but the page could not refresh')} retry={() => { void refresh().then((ok) => setRefreshFailed(!ok)); }} />}
      <Button type="button" onClick={onClose}>{copy('Close')}</Button></div> : <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-2">{copy('Current subscription')}: <PlanChip plan={current} /></p>
      {catalogue.loading ? <LoadingState /> : catalogue.error ? <RequestError message={copy('Could not load plans. Try again.')} retry={() => { void catalogue.refetch(); }} /> : <PlanChoices value={target} onValueChange={setTarget} catalogue={catalogue.data?.plans ?? []} disabled={busy} />}
      <PromotionNote plan={target} enabled={catalogue.data?.promotionsEnabled ?? false} />
      <p className="text-sm text-muted-foreground">{copy('The server returns the exact difference after confirmation. No payment or refund is recorded by this action.')}</p>
      {error && <RequestError message={error} />}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{copy('Back')}</Button><Button type="button" disabled={busy || target === current || !catalogue.data?.plans.some((row) => row.plan === target && row.active)} onClick={() => { void confirm(); }}>{copy(busy ? 'Saving…' : 'Confirm plan change')}</Button></div>
    </div>}
  </DialogContent></Dialog>;
}
