'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { plansApi, type PlanCatalogueRow, type PlanKey, type PlanMonths } from '@/lib/api/plans';
import { AdminApiError } from '@/lib/api/admin-client';
import { decimalMoney } from '@/lib/api/subscribers';
import { usePlanCatalogue } from '@/lib/api/hooks/use-plan-catalogue';
import { featureLabels, planMonths, planPriceRequest, priceFields, planMoneyLabel } from '@/lib/subscription-plans';
import { useDashboardCopy } from './dashboard-text';
import { RecordCell } from './record-cell';
import { RecordList } from './record-list';
import { FormActionBar } from './form-action-bar';
import { Field, LoadingState, RequestError, useSubscriberText } from './subscriber-ui';

export function SubscriberPlans({ canWrite, active, onEdit }: { canWrite: boolean; active: boolean; onEdit: () => void }) {
  const copy = useDashboardCopy();
  const resource = usePlanCatalogue();
  const [editing, setEditing] = React.useState<PlanKey | null>(null);
  return <Card><CardHeader><CardTitle>{copy('Plans')}</CardTitle><p className="text-sm text-muted-foreground">{copy('Set prices for each length. Empty clears the price, not to zero.')}</p></CardHeader><CardContent className="space-y-6">
    {resource.loading ? <LoadingState /> : resource.error ? <RequestError message={copy('Could not load plans. Try again.')} retry={() => { void resource.refetch(); }} /> : <RecordList scope="plans" renderWhenEmpty records={resource.data?.plans ?? []} searchText={(plan) => `${plan.nameAr} ${plan.nameEn} ${plan.features.map((feature) => copy(featureLabels[feature])).join(' ')}`} filters={[{ key: 'state', label: 'All plan states', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive plan' }], value: (plan) => plan.active ? 'active' : 'inactive' }]} render={(visible) => <div className="space-y-6">{(resource.data?.plans ?? []).map((plan) => <div key={plan.plan} hidden={!visible.some((entry) => entry.plan === plan.plan)}><PlanPrices plan={plan} canWrite={canWrite} active={active && editing === plan.plan} onEdit={() => { setEditing(plan.plan); onEdit(); }} /></div>)}</div>} />}
  </CardContent></Card>;
}
function PlanPrices({ plan, canWrite, active, onEdit }: { plan: PlanCatalogueRow; canWrite: boolean; active: boolean; onEdit: () => void }) {
  const copy = useDashboardCopy();
  const { lang } = useSubscriberText();
  const [saved, setSaved] = React.useState(plan);
  const initial = (row: PlanCatalogueRow) => Object.fromEntries(planMonths.map((months) => [months, row.prices[months] ?? ''])) as Record<PlanMonths, string>;
  const [prices, setPrices] = React.useState(() => initial(plan));
  const [busy, setBusy] = React.useState(false);
  const writing = React.useRef(false);
  const [error, setError] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const dirty = planMonths.some((months) => prices[months] !== (saved.prices[months] ?? ''));
  const save = async () => {
    if (!canWrite || !dirty || writing.current) return;
    const invalid: Record<string, string> = {};
    for (const months of planMonths) {
      try { if (prices[months].trim()) decimalMoney(prices[months]); }
      catch { invalid[priceFields[months]] = copy('Enter a non-negative amount with at most two decimal places.'); }
    }
    setErrors(invalid); setError('');
    if (Object.keys(invalid).length) return;
    writing.current = true; setBusy(true);
    try {
      const result = await plansApi.update(plan.plan, planPriceRequest(prices));
      setSaved(result); setPrices(initial(result)); toast.success(copy('Saved'));
    } catch (caught) {
      setErrors(caught instanceof AdminApiError ? caught.fields : {});
      setError(copy('Could not save this plan. Try again.'));
    } finally { writing.current = false; setBusy(false); }
  };
  return <section className="min-w-0 space-y-4 border-t pt-4 first:border-0 first:pt-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><RecordCell icon="plan" nameAr={saved.nameAr} nameEn={saved.nameEn} />{!saved.active && <span className="text-sm text-muted-foreground">{copy('Inactive plan')}</span>}</div>
    <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">{saved.features.map((feature) => <li key={feature}>{copy(featureLabels[feature])}</li>)}</ul>
    <div className="grid gap-4 sm:grid-cols-2">{planMonths.map((months) => <Field key={months} label={`${copy(`${months} ${months === '1' ? 'month' : 'months'}`)} · ${copy('EGP')}`} error={errors[priceFields[months]]}>
      {canWrite ? <Input type="text" inputMode="decimal" dir="ltr" disabled={busy} value={prices[months]} placeholder={copy('No price set')} onFocus={onEdit} onChange={(event) => { onEdit(); setPrices((current) => ({ ...current, [months]: event.target.value })); setErrors((current) => ({ ...current, [priceFields[months]]: '' })); setError(''); }} /> : <p className="tabular-nums">{saved.prices[months] === null ? copy('No price set') : planMoneyLabel(saved.prices[months], lang)}</p>}
    </Field>)}</div>
    {error && <RequestError message={error} />}
    {canWrite && <Button type="button" variant="outline" onClick={onEdit}>{copy('Plan prices')}: {copy(plan.plan === 'owner' ? 'Owner' : 'Owner Plus')}</Button>}
    {canWrite && active && <FormActionBar dirty={dirty} saving={busy} error={error} primaryLabel={`${copy('Save plan')}: ${copy(plan.plan === 'owner' ? 'Owner' : 'Owner Plus')}`} onSave={() => { void save(); }} onCancel={() => { setPrices(initial(saved)); setErrors({}); setError(''); }} />}
  </section>;
}
