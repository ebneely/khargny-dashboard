import type { AdminPlace } from './types';

export function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export type Money = string | null;
export type PaymentMethod = 'cash' | 'instapay' | 'bank_transfer' | 'wallet' | 'other';
export interface SubscriberPlace {
  coverImage?: string | null;
  coverImageDimensions?: { width: number; height: number } | null;
  subscriber?: { id: string; name: string } | null;
  id: string;
  name: string;
  nameEn: string | null;
  slug: string;
  cityId: string;
}
export interface Payment {
  id: string;
  amount: Money;
  currency: 'EGP';
  method: PaymentMethod;
  paidAt: string;
  notes: string | null;
  recordedBy: { id: string; email: string };
}
export interface Subscription {
  id: string;
  subscriberId: string;
  placeId: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: 'scheduled' | 'active' | 'expired' | 'cancelled';
  notes: string | null;
  cancelledAt: string | null;
  payments: Payment[];
  paidTotal: Money;
}
export interface Visit {
  id: string;
  subscriberId: string | null;
  placeId: string;
  visitedAt: string;
  visitedBy: { id: string; email: string };
  notes: string | null;
  consent: boolean;
  imageCount: number;
  videoCount: number;
}
export interface SubscriberAccount {
  id: string;
  subscriberId: string;
  phone: string;
  status: 'active' | 'suspended';
  lastLoginAt: string | null;
  createdAt: string;
}
export interface Subscriber {
  id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  createdAt: string;
  places: SubscriberPlace[];
  currentSubscription: Subscription | null;
  paidTotal: Money;
  account: SubscriberAccount | null;
}
export interface SubscriberDetail extends Subscriber {
  subscriptions: Subscription[];
  visits: Visit[];
}
export interface SubscriberSummary {
  active: number;
  expiringWithin30Days: number;
  revenueThisMonth: Money;
}
export interface SubscriberSettings {
  renewalPhone: string | null;
  renewalWhatsapp: string | null;
}
export interface MenuSection {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  sortOrder?: number;
}
export interface MenuItem {
  id: string;
  sectionId: string | null;
  nameAr: string;
  nameEn?: string | null;
  price: string;
  available: boolean;
  hidden: boolean;
  sortOrder?: number;
  image?: { url: string; thumb?: string; small?: string; medium?: string } | null;
  updatedAt?: string;
}
export interface PlaceMenu {
  placeId: string;
  hidden: boolean;
  sections: MenuSection[];
  items: MenuItem[];
}
export interface PriceSuggestion {
  suggestedLevel: number | null;
  itemCount: number;
  medianPrice: Money;
  currentLevel: number | null;
  verified: boolean;
  verifiedAt: string | null;
  verifiedBy: { id: string; email: string } | null;
}
export type PlaceDetailResponse = AdminPlace | { place: AdminPlace };

export function isEgyptianMobile(value: string): boolean {
  return /^(?:01\d{9}|(?:\+20|0020|20)1\d{9})$/.test(value.trim());
}

export function lastSubscriberPage(skip: number, total: number, limit: number): number {
  return Math.min(skip, Math.max(0, Math.ceil(total / limit) - 1) * limit);
}

export function validateMenuImage(file: Pick<File, 'type' | 'size'>): void {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('INVALID_MENU_IMAGE_TYPE');
  if (file.size > 5 * 1024 * 1024) throw new Error('MENU_IMAGE_TOO_LARGE');
}

export function decimalMoney(value: string): string {
  const trimmed = value.trim().replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/٫/g, '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) throw new Error('INVALID_AMOUNT');
  const [whole, fraction = ''] = trimmed.split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}.${fraction.padEnd(2, '0')}`;
}

export function cairoDate(): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
