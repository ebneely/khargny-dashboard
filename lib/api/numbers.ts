import { adminApi } from './admin-client';

/** Team-only Numbers (spec 002 T044-T046): hype score, insight cards, built-in answers. */
export type NumbersWindow = 'live' | '24h' | '7d' | '30d';
export type HypeKind = 'place' | 'area' | 'category' | 'collection';

export interface HypeItem { id: string; name: string; nameEn: string | null; score: number; points: number; views: number; likes: number; saves: number; shares: number; goes: number }
export interface InsightCard { kind: 'rising' | 'fading' | 'hype_now' | 'gap' | 'money'; number: string; sentence: string; compared: string; why: string; action: { label: string; href: string } }
export interface Answer { key: string; question: string; sentence: string; number: string | null; href: string }

export const loadHype = (window: NumbersWindow, kind: HypeKind) => adminApi.get<{ items: HypeItem[] }>('/v1/admin/hype', { window, kind });
export const loadInsights = (window: NumbersWindow) => adminApi.get<{ compared: string; cards: InsightCard[] }>('/v1/admin/insights', { window });
export const loadAnswers = (window: NumbersWindow) => adminApi.get<{ answers: Answer[] }>('/v1/admin/answers', { window });
