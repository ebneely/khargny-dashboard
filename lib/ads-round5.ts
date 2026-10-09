import type { AdCampaignInput, AdCampaignReport, AdInventory, AdPlacement } from '@/lib/api/ads';
import { isCalendarDate } from '@/lib/subscription-calendar';

export type CampaignStep = 'who' | 'where' | 'when' | 'money';
export interface CampaignValues {
  placeId: string;
  placement: AdPlacement;
  cityId: string;
  startDate: string;
  endDate: string;
  advertiserName: string;
  advertiserPhone: string;
  amountPaid: string;
  currency: string;
  notes: string;
}

export function campaignErrors(values: CampaignValues, placeCity?: string): { step: CampaignStep; message: string }[] {
  const errors: { step: CampaignStep; message: string }[] = [];
  if (!values.placeId) errors.push({ step: 'who', message: 'Choose a place.' });
  if (!values.advertiserName.trim()) errors.push({ step: 'money', message: 'Enter the advertiser name.' });
  if (!isCalendarDate(values.startDate) || !isCalendarDate(values.endDate)) errors.push({ step: 'when', message: 'Choose both booking dates.' });
  else if (values.endDate < values.startDate) errors.push({ step: 'when', message: 'End date must be on or after the start date.' });
  if (values.placement === 'top10' && values.cityId && placeCity !== values.cityId) errors.push({ step: 'where', message: 'For a city Top 10 campaign, choose the place’s own city.' });
  if (!Number.isFinite(Number(values.amountPaid)) || Number(values.amountPaid) < 0) errors.push({ step: 'money', message: 'Amount paid must be zero or more.' });
  if (!/^[A-Z]{3}$/.test(values.currency)) errors.push({ step: 'money', message: 'Currency must be three uppercase letters.' });
  return errors;
}

export function campaignPayload(values: CampaignValues, editing: boolean): AdCampaignInput {
  return {
    placeId: values.placeId, placement: values.placement,
    cityId: values.placement === 'top10' ? values.cityId || null : null,
    startDate: values.startDate, endDate: values.endDate,
    advertiserName: values.advertiserName.trim(),
    advertiserPhone: editing ? values.advertiserPhone.trim() : values.advertiserPhone.trim() || undefined,
    amountPaid: Number(values.amountPaid), currency: values.currency,
    notes: editing ? values.notes.trim() : values.notes.trim() || undefined,
  };
}

export function bookedRange(data: AdInventory, placement: AdPlacement, cityId: string | null, from: string, to: string) {
  return data.scopes.find((scope) => scope.placement === placement && scope.cityId === cityId)?.days.filter((day) => day.date >= from && day.date <= to) ?? [];
}

export function reportTotals(report: AdCampaignReport, from: string, to: string) {
  const days = report.days.filter((day) => day.date >= from && day.date <= to);
  const impressions = days.reduce((total, day) => total + day.impressions, 0);
  const taps = days.reduce((total, day) => total + day.taps, 0);
  return { impressions, taps, ctr: impressions ? taps / impressions : null };
}
