import type { DashLang } from './dashboard-lang';

export const PRICE_BANDS = [
  { level: 1, labelEn: '1 – 100 EGP', labelAr: '1 – 100 جنيه' },
  { level: 2, labelEn: '100 – 500 EGP', labelAr: '100 – 500 جنيه' },
  { level: 3, labelEn: '500 – 1,000 EGP', labelAr: '500 – 1,000 جنيه' },
  { level: 4, labelEn: '1,000 – 5,000+ EGP', labelAr: '1,000 – 5,000+ جنيه' },
] as const;

export function priceBandLabel(level: number | null | undefined, lang: DashLang): string {
  const band = PRICE_BANDS.find((entry) => entry.level === level);
  return band ? (lang === 'ar' ? band.labelAr : band.labelEn) : (lang === 'ar' ? 'غير محدد' : 'Not set');
}

export function priceRangeLabel(level: number | null | undefined, lang: DashLang): string {
  const label = priceBandLabel(level, lang);
  return lang === 'ar' ? `نطاق السعر: ${label}` : `Price range: ${label === 'Not set' ? 'not set' : label}`;
}
