import { translateDashboardCopy } from './dashboard-copy';
import { decimalMoney, optionalText, type Subscription } from './api/subscribers';
import { type CalendarLength } from './subscription-calendar';
import type { PlanKey, PlanKind } from './api/plans';

export const subscriptionPresets: { id: string; label: string; length: CalendarLength; trial: boolean }[] = [
  { id: 'trial14', label: '14-day free trial', length: { days: 14 }, trial: true },
  { id: 'trialMonth', label: '1-month free trial', length: { months: 1 }, trial: true },
  { id: 'month1', label: '1 month', length: { months: 1 }, trial: false },
  { id: 'month2', label: '2 months', length: { months: 2 }, trial: false },
  { id: 'month3', label: '3 months', length: { months: 3 }, trial: false },
  { id: 'month6', label: '6 months', length: { months: 6 }, trial: false },
];

export function trialPreset(planName: string, planKind?: PlanKind) {
  if (planKind !== undefined) return subscriptionPresets.find((preset) => preset.id === (planKind === 'trial_14_days' ? 'trial14' : planKind === 'trial_1_month' ? 'trialMonth' : ''));
  return subscriptionPresets.find((preset) => preset.trial && (preset.label === planName || translateDashboardCopy(preset.label, 'ar') === planName));
}

export function usedTrial(history: Subscription[], placeId: string, presetId: string) {
  return history.filter((subscription) => subscription.placeId === placeId && trialPreset(subscription.planName, subscription.planKind)?.id === presetId).sort((first, second) => first.startDate.localeCompare(second.startDate))[0];
}

export type SubscriptionDraft = { placeId: string; planName: string; plan: PlanKey; planKind: PlanKind; startDate: string; endDate: string; notes: string; amount: string; method: string; paidAt: string; paymentNotes: string };

export function subscriptionRequest(subscriberId: string, renewal: Subscription | undefined, draft: SubscriptionDraft, _free: boolean, allowRepeatTrial = false) {
  const payment = draft.planKind === 'paid' && draft.amount.trim() ? { amount: decimalMoney(draft.amount), method: draft.method, paidAt: draft.paidAt, ...(optionalText(draft.paymentNotes) ? { notes: draft.paymentNotes } : {}) } : undefined;
  const shared = { planName: draft.planName, plan: draft.plan, planKind: draft.planKind, ...(allowRepeatTrial ? { allowRepeatTrial: true } : {}) };
  if (renewal) {
    return { path: `/v1/admin/subscriptions/${renewal.id}/renew`, body: { ...shared, startDate: draft.startDate, endDate: draft.endDate, ...(payment ? { payment } : {}) } };
  }
  return { path: `/v1/admin/subscribers/${subscriberId}/subscriptions`, body: { placeId: draft.placeId, ...shared, startDate: draft.startDate, endDate: draft.endDate, ...(optionalText(draft.notes) ? { notes: draft.notes } : {}), ...(payment ? { payment } : {}) } };
}
