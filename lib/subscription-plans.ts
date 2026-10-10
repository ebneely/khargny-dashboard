import { decimalMoney } from './api/subscribers';
import type { PlanKey, PlanMonths, PlanCatalogueRow, PlanPatch } from './api/plans';

export const PLUS_PROMOTION_NOTE = 'Promotion for Owner Plus is not switched on yet';
export const featureLabels = {
  portal_edit: 'Edit places in the subscriber portal', services_prices: 'Services and prices', badge_eligibility: 'Eligibility for earned badges', statistics: 'Place statistics',
  area_category_promotion: 'Promotion in area and category lists', featured_rotation: 'Featured rotation', city_top10_rotation: 'City Top 10 rotation', monthly_report: 'Monthly report',
};
export const planMonths: PlanMonths[] = ['1', '2', '3', '6'];
export const priceFields = { '1': 'price1Month', '2': 'price2Months', '3': 'price3Months', '6': 'price6Months' } as const;
export function planMoneyLabel(value: string, lang: 'en' | 'ar') {
  return lang === 'ar' ? value.replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]).replace('.', '٫') : value;
}
export function planPriceRequest(values: Record<PlanMonths, string>): PlanPatch {
  return Object.fromEntries(planMonths.map((months) => [priceFields[months], values[months].trim() ? decimalMoney(values[months]) : null]));
}
export function cataloguePrice(catalogue: PlanCatalogueRow[], plan: PlanKey, presetId: string | null) {
  const months = presetId?.replace('month', '') as PlanMonths;
  return planMonths.includes(months) ? catalogue.find((row) => row.plan === plan)?.prices[months] ?? null : null;
}
export function changePlanRequest(plan: PlanKey, payment?: { amount: string; method: string; paidAt: string }) {
  return { plan, effective: 'now' as const, ...(payment ? { payment: { ...payment, amount: decimalMoney(payment.amount) } } : {}) };
}
