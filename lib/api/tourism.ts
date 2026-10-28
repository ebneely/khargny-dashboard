// Team API for the Trips marketplace (khargny-backend `/v1/admin/tourism`, API.md "Tourism P2P").
import { API_BASE_URL } from '@/lib/config';

export const TOURISM_API = '/v1/admin/tourism';

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected';
export type TripStatus = 'pending' | 'live' | 'rejected' | 'hidden' | 'cancelled';
export type RewardStatus = 'waiting' | 'cash_given' | 'confirmed' | 'disputed' | 'reimbursed' | 'void';

export interface TourismSettings {
  rewardsEnabled: boolean;
  rewardAmountEgp: number;
  budgetEgp: number;
  earlyBirdPerTrip: number;
  inviteCap: number;
  weeklyCapPerAgency: number;
}

export interface TourismOverview {
  listers: Partial<Record<KycStatus, number>>;
  trips: Partial<Record<TripStatus, number>>;
  rewards: Partial<Record<RewardStatus, number>>;
  openReports: number;
  customers: number;
  activeBookings: number;
  budget: { budgetEgp: number; spentEgp: number; leftEgp: number };
  settings: TourismSettings;
}

export interface ListerRow {
  id: string;
  name: string;
  kind: 'agency' | 'guide' | 'individual';
  city: string;
  phone: string;
  status: 'active' | 'suspended';
  kycStatus: KycStatus;
  kycSubmittedAt: string | null;
  createdAt: string;
  trips: number;
  likeCount: number;
  viewCount: number;
  ratingCount: number;
  ratingSum: number;
}

export interface TourismTrip {
  id: string;
  kind: 'trip' | 'event';
  title: string;
  titleEn: string | null;
  destination: string;
  departureCity: string;
  startsAt: string;
  endsAt: string;
  priceEgp: number;
  seatsTotal: number;
  seatsBooked: number;
  seatsLeft: number;
  monitored: boolean;
  status: TripStatus;
  likeCount: number;
  viewCount: number;
  ratingCount: number;
  rating: number | null;
  coverUrl: string | null;
  description?: string;
  includes?: string | null;
  rejectionReason?: string | null;
  reports?: number;
  agency: { id: string; name: string; kind: string; verified: boolean };
}

export interface ListerDetail extends Omit<ListerRow, 'trips' | 'likeCount' | 'viewCount' | 'ratingCount' | 'ratingSum'> {
  ownerName: string | null;
  licenseNumber: string | null;
  nationalId: string | null;
  instapay: string | null;
  kycRejectionReason: string | null;
  reviewedAt: string | null;
  verified: boolean;
  metrics: { trips: number; likeCount: number; viewCount: number; ratingCount: number; rating: number | null; seatsBooked: number };
  documents: { type: DocumentType; createdAt: string }[];
  trips: TourismTrip[];
  redemptions: { owedEgp: number; waitingAnswerEgp: number; disputedEgp: number; reimbursedEgp: number };
}

export type DocumentType = 'id_front' | 'id_back' | 'selfie' | 'license';

export interface Redemption {
  id: string;
  kind: 'early_bird' | 'invite_welcome' | 'invite_bonus';
  status: RewardStatus;
  amountEgp: number;
  cashGivenAt: string | null;
  answeredAt: string | null;
  reimbursedAt: string | null;
  resolutionNote: string | null;
  customerName: string;
  customerPhone: string;
  agencyId: string;
  agencyName: string;
  agencyInstapay: string | null;
}

export interface OwedLister { agencyId: string; agencyName: string; instapay: string | null; owedEgp: number; count: number }

export interface TourismReport {
  id: string;
  reason: string;
  status: 'open' | 'closed';
  createdAt: string;
  tripId: string;
  tripTitle: string;
  tripStatus: TripStatus;
  monitored: boolean;
  agencyId: string;
  agencyName: string;
  customerName: string;
}

export const tripCover = (trip: Pick<TourismTrip, 'coverUrl'>) => trip.coverUrl ? `${API_BASE_URL}${trip.coverUrl}` : null;

/** Average stars with one decimal, or null before the first rating (the backend's rule). */
export const averageRating = (sum: number, count: number) => count ? Math.round((sum / count) * 10) / 10 : null;

/** Trips waiting for review come first, then the rest in the order the team acts on them. */
export const TRIP_STATUS_ORDER: TripStatus[] = ['pending', 'live', 'rejected', 'hidden', 'cancelled'];
