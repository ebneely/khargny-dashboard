import { AR_LOCALE, localeFor } from '@/lib/locale';
import type { BadgeKey, BadgeRule, PlaceBadgeStatus } from './api/badges';
import { translateDashboardCopy } from './dashboard-copy';
import { isCalendarDate } from './subscription-calendar';

export const badgeMeasures: Partial<Record<BadgeKey, BadgeRule['measure']>> = { most_5argnyd: 'directions', most_saved: 'save', most_viewed: 'view' };
export const badgeMetric = { directions: '5argny taps', save: 'saves', view: 'views' };
export const statusBadgeRules = { pricing: 'A place gets it when its non-hidden price list has at least one visible item or service.', price_match: 'A place gets it when the team has reviewed its prices.', visited: 'A place gets it when a team visit is recorded.' };
export interface RuleControls { scope: string; windowDays: string; winners: string; floor: string }
export function ruleControls(rule: BadgeRule): RuleControls { return { scope: rule.scope, windowDays: rule.windowDays === null ? 'all' : String(rule.windowDays), winners: String(rule.winners), floor: String(rule.floor) }; }
export function ruleFromControls(key: BadgeKey, fields: RuleControls): BadgeRule {
  const measure = badgeMeasures[key];
  const winners = Number(fields.winners), floor = Number(fields.floor), windowDays = fields.windowDays === 'all' ? null : Number(fields.windowDays);
  if (!measure || !['city', 'city_category'].includes(fields.scope) || ![7, 30, 90, null].includes(windowDays) || !/^\d+$/.test(fields.winners) || !/^\d+$/.test(fields.floor) || !Number.isInteger(winners) || winners < 1 || winners > 10 || !Number.isSafeInteger(floor) || floor < 1) throw new Error('INVALID_BADGE_RULE');
  return { measure, scope: fields.scope as BadgeRule['scope'], windowDays: windowDays as BadgeRule['windowDays'], winners, floor };
}
export function badgeValueText(value: number, measure: BadgeRule['measure'], days: number | null, lang: 'en' | 'ar') {
  const copy = (text: string) => translateDashboardCopy(text, lang);
  return `${value.toLocaleString(localeFor(lang))} ${copy(badgeMetric[measure])} ${days === null ? copy('All time') : `${days.toLocaleString(localeFor(lang))} ${copy('days')}`}`;
}
/** Who gives each badge: pricing follows the price list, the team gives price match and visited, achievements are ranked with team pins and exclusions. */
export const badgeGivenBy: Record<BadgeKey, string> = { pricing: 'Automatic', price_match: 'Manual', visited: 'Manual', most_5argnyd: 'Automatic, with manual pin and exclude', most_saved: 'Automatic, with manual pin and exclude', most_viewed: 'Automatic, with manual pin and exclude' };
export function achievementRuleText(rule: BadgeRule, lang: 'en' | 'ar') {
  const copy = (text: string) => translateDashboardCopy(text, lang);
  const number = (value: number) => value.toLocaleString(localeFor(lang));
  return `${copy('Give it to the top')} ${number(rule.winners)} ${copy('places in each')} ${copy(rule.scope === 'city' ? 'City' : 'City and category')} ${copy('by')} ${copy(badgeMetric[rule.measure])} ${copy('over')} ${rule.windowDays === null ? copy('All time') : `${number(rule.windowDays)} ${copy('days')}`} ${copy('if they have at least')} ${number(rule.floor)}.`;
}
/** A timestamp as a 12-hour Cairo date and time. */
export function cairoDateTime(value: string, lang: 'en' | 'ar') {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(lang === 'ar' ? AR_LOCALE : 'en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short', hour12: true }).format(date);
}
export function badgeExplanation(status: PlaceBadgeStatus, rule: BadgeRule | null, lang: 'en' | 'ar') {
  const copy = (text: string) => translateDashboardCopy(text, lang);
  if (!status.enabled) return copy('Hidden everywhere');
  if (status.override && !status.override.expired) return `${copy(status.override.kind === 'pin' ? 'Pinned by the team' : 'Excluded by the team')}: ${status.override.reason}`;
  if (!rule) return '';
  if (status.eligible === false) return copy('Not eligible: publish the place and add a photo or video.');
  const value = status.value === null ? '—' : badgeValueText(status.value, rule.measure, status.windowDays, lang);
  const city = status.scope?.city;
  const category = status.scope?.category;
  const scope = [city ? (lang === 'ar' ? city.name : city.nameEn || city.name) : '', category ? (lang === 'ar' ? category.name : category.nameEn || category.name) : ''].filter(Boolean).join(' ');
  return status.held ? `${copy('Rank')} ${status.rank?.toLocaleString(localeFor(lang)) ?? '—'} ${copy('of')} ${status.candidates?.toLocaleString(localeFor(lang)) ?? '—'} ${copy('in')} ${scope || '—'}: ${value}` : `${copy('Not held')}: ${value}${status.floor !== null && (status.value ?? 0) < status.floor ? ` ${copy('needs')} ${status.floor.toLocaleString(localeFor(lang))}` : ` ${copy('Below the winners')}`}`;
}
export function overrideRequest(placeId: string, kind: 'pin' | 'exclude', reason: string, date: string) {
  if (!date) return { placeId, kind, reason: reason.trim() };
  if (!isCalendarDate(date)) throw new Error('INVALID_OVERRIDE_DATE');
  const noon = new Date(`${date}T12:00:00Z`);
  const offset = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Cairo', timeZoneName: 'longOffset' }).formatToParts(noon).find((part) => part.type === 'timeZoneName')?.value.replace('GMT', '') || '+00:00';
  return { placeId, kind, reason: reason.trim(), until: new Date(`${date}T23:59:59.999${offset}`).toISOString() };
}
