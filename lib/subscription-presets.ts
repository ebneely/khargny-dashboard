import { translateDashboardCopy } from './dashboard-copy';
import { decimalMoney, optionalText, type Subscription } from './api/subscribers';
import { shiftCalendarDays, type CalendarLength } from './subscription-calendar';

export const subscriptionPresets: { id: string; label: string; length: CalendarLength; trial: boolean }[] = [
  { id: 'trial14', label: '14-day free trial', length: { days: 14 }, trial: true },
  { id: 'trialMonth', label: '1-month free trial', length: { months: 1 }, trial: true },
  { id: 'month1', label: '1 month', length: { months: 1 }, trial: false },
  { id: 'month2', label: '2 months', length: { months: 2 }, trial: false },
  { id: 'month3', label: '3 months', length: { months: 3 }, trial: false },
  { id: 'month6', label: '6 months', length: { months: 6 }, trial: false },
];

export function trialPreset(planName: string) {
  return subscriptionPresets.find((preset) => preset.trial && (preset.label === planName || translateDashboardCopy(preset.label, 'ar') === planName));
}

export function usedTrial(history: Subscription[], placeId: string, presetId: string) {
  return history.filter((subscription) => subscription.placeId === placeId && trialPreset(subscription.planName)?.id === presetId).sort((first, second) => first.startDate.localeCompare(second.startDate))[0];
}

export type SubscriptionDraft = { placeId: string; planName: string; startDate: string; endDate: string; notes: string; amount: string; method: string; paidAt: string; paymentNotes: string };

export function subscriptionRequest(subscriberId: string, renewal: Subscription | undefined, draft: SubscriptionDraft, free: boolean) {
  const payment = !free && draft.amount ? { amount: decimalMoney(draft.amount), method: draft.method, paidAt: draft.paidAt, notes: optionalText(draft.paymentNotes) } : undefined;
  if (renewal && draft.startDate === shiftCalendarDays(renewal.endDate, 1)) {
    return { path: `/v1/admin/subscriptions/${renewal.id}/renew`, body: { planName: draft.planName, endDate: draft.endDate, ...(payment ? { payment } : {}) } };
  }
  return { path: `/v1/admin/subscribers/${subscriberId}/subscriptions`, body: { placeId: draft.placeId, planName: draft.planName, startDate: draft.startDate, endDate: draft.endDate, notes: optionalText(draft.notes), ...(payment ? { payment } : {}) } };
}
