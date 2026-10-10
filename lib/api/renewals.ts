import { adminApi } from './admin-client';
import type { Subscription, TimeLeft } from './subscribers';
import type { PlanKey } from './plans';

export type RenewalStatus = 'submitted' | 'needs_proof' | 'confirmed' | 'rejected';
export type RenewalMethod = 'instapay' | 'wallet' | 'bank_transfer' | 'cash';
export type ReminderKind = 'ending_soon' | 'unpaid_renewal' | 'in_grace';
export interface RenewalRequest {
  id: string;
  subscriptionId: string;
  subscriberId: string;
  placeId: string;
  plan: PlanKey;
  months: 1 | 2 | 3 | 6;
  claimedAmount: string;
  currency: 'EGP';
  method: RenewalMethod;
  note: string | null;
  status: RenewalStatus;
  rejectReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  resultingSubscriptionId: string | null;
  resultingPaymentId: string | null;
  hasProof: boolean;
  proofRevision: string | null;
  olderThan24h: boolean;
  subscriber: { id: string; name: string };
  place: { id: string; name: string; nameEn: string | null };
}
export interface RenewalPreview {
  dryRun: true;
  planDigest: string;
  items: { id: string; wouldConfirm: boolean; reason: string | null; amount: string; catalogueAmount: string | null }[];
}
export interface RenewalOutcome {
  id: string;
  status: 'confirmed' | 'excluded' | 'failed';
  reason?: string;
  subscriptionId?: string;
  paymentId?: string;
}
export interface ReminderResult {
  subscriberId: string;
  notice: { id: string; kind: ReminderKind; day: string; createdAt: string };
  language: 'ar' | 'en';
  message: string;
  whatsappUrl: string;
}
export const renewalsApi = {
  list: (params?: { status?: RenewalStatus; olderThan24h?: boolean; subscriberId?: string }) => adminApi.get<RenewalRequest[]>('/v1/admin/renewals', params),
  proof: (id: string, signal: AbortSignal) => adminApi.blob(`/v1/admin/renewals/${id}/proof`, signal),
  submitCash: (form: FormData) => adminApi.upload<RenewalRequest>('/v1/admin/renewals', form),
  confirm: (id: string, values: { amount: string; method: RenewalMethod; paidOn: string; note?: string | null }) => adminApi.post<{ request: RenewalRequest; subscription: Subscription; paymentId: string }>(`/v1/admin/renewals/${id}/confirm`, values),
  reject: (id: string, reason: string) => adminApi.post<RenewalRequest>(`/v1/admin/renewals/${id}/reject`, { reason }),
  askProof: (id: string, reason: string) => adminApi.post<RenewalRequest>(`/v1/admin/renewals/${id}/ask-proof`, { reason }),
  preview: (ids: string[]) => adminApi.post<RenewalPreview>('/v1/admin/renewals/bulk-confirm', { ids, dryRun: true }),
  apply: (ids: string[], planDigest: string) => adminApi.post<{ dryRun: false; planDigest: string; outcomes: RenewalOutcome[] }>('/v1/admin/renewals/bulk-confirm', { ids, dryRun: false, planDigest }),
  extendGrace: (id: string, reason?: string) => adminApi.post<{ id: string; endDate: string; graceUntil: string; timeLeft: TimeLeft }>(`/v1/admin/subscriptions/${id}/extend-grace`, reason ? { reason } : {}),
  reminder: (id: string, kind: ReminderKind, language: 'ar' | 'en') => adminApi.post<ReminderResult>(`/v1/admin/subscribers/${id}/reminder`, { kind, language }),
};
