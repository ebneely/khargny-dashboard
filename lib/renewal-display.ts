import type { Subscription } from './api/subscribers';

function shortDate(value: string, lang: 'en' | 'ar') {
  const date = new Date(value + 'T00:00:00Z');
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
}

export function timeLeftLabel(subscription: Pick<Subscription, 'status' | 'startDate' | 'timeLeft'>, lang: 'en' | 'ar') {
  if (subscription.status === 'scheduled') return lang === 'ar' ? `يبدأ ${shortDate(subscription.startDate, lang)}` : `Starts ${shortDate(subscription.startDate, lang)}`;
  const time = subscription.timeLeft;
  if (!time) return lang === 'ar' ? 'المدة المتبقية غير متاحة' : 'Time left unavailable';
  const days = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en').format(Math.abs(time.days));
  if (time.state === 'awaiting_review') return lang === 'ar' ? 'بانتظار مراجعتنا' : 'Waiting for our review';
  if (time.state === 'in_grace' && time.graceUntil) return lang === 'ar' ? `في المهلة حتى ${shortDate(time.graceUntil, lang)}` : `In grace until ${shortDate(time.graceUntil, lang)}`;
  if (time.state === 'ended' && time.days > 0) return lang === 'ar' ? 'انتهى' : 'Ended';
  if (time.state === 'ended') return lang === 'ar' ? `انتهى منذ ${days} أيام` : `Ended ${days} days ago`;
  if (time.days === 0) return lang === 'ar' ? 'ينتهي اليوم' : 'Ends today';
  return lang === 'ar' ? `متبقٍ ${days} يوماً` : `${days} days left`;
}

export function renewalWaitLabel(createdAt: string, lang: 'en' | 'ar', now = Date.now()) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return lang === 'ar' ? 'مدة الانتظار غير متاحة' : 'Waiting time unavailable';
  const hours = Math.max(0, Math.floor((now - created) / 3600000));
  if (!hours) return lang === 'ar' ? 'منذ أقل من ساعة' : 'Less than an hour ago';
  return new Intl.RelativeTimeFormat(lang === 'ar' ? 'ar-EG' : 'en', { numeric: 'always' }).format(-hours, 'hour');
}

export function renewalSentLabel(createdAt: string, lang: 'en' | 'ar') {
  const created = new Date(createdAt);
  return Number.isNaN(created.getTime()) ? '—' : new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(created);
}
