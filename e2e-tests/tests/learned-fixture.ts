import { expect } from 'e2e';
import { adminCredentials } from './admin-credentials.js';

// Decision 0007 test data, made through the real API:
// - a learned word needs five different web visitors who searched the word, saw the place and tapped it, then one pass
//   of the hourly learned-keyword statement (POST /v1/admin/algorithm/keywords/run);
// - a viewer is a real admin account with the viewer role, so the dashboard renders it read-only.
// Every term and visitor carries a run stamp, so a test never sees another test's rows.

const api = process.env.E2E_API_URL ?? 'http://localhost:3110';
const browserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

export type Call = { status: number; body: any; data: any };

export async function call(path: string, init: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<Call> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${api}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (response.status !== 429) {
      const parsed = await response.json().catch(() => ({}));
      return { status: response.status, body: parsed, data: parsed?.data ?? parsed };
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`rate limited: ${path}`);
}

export const stamp = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`;

let admin: Promise<string> | undefined;
export function adminToken() {
  admin ??= signIn(adminCredentials.username, adminCredentials.password);
  return admin;
}

export async function signIn(email: string, password: string) {
  const response = await call('/v1/auth/login', { method: 'POST', body: { email, password } });
  expect(response.status).toBe(200);
  return response.data.access_token as string;
}

export const VIEWER = { email: 'e2e-viewer@khargny.local', password: 'Viewer12345!' };

/** The viewer account, created once per run; an existing one is reused (the API answers 409). */
export async function ensureViewer() {
  const token = await adminToken();
  const created = await call('/v1/admin/admins', { method: 'POST', token, body: { email: VIEWER.email, password: VIEWER.password, role: 'viewer' } });
  expect([200, 201, 409]).toContain(created.status);
  return VIEWER;
}

export function viewerToken() {
  return signIn(VIEWER.email, VIEWER.password);
}

async function placeBySlug(slug: string) {
  const token = await adminToken();
  const list = await call(`/v1/admin/places?search=${encodeURIComponent(slug)}&limit=20`, { token });
  const rows = (list.data?.data ?? list.data) as { id: string; slug: string }[];
  const place = rows.find((row) => row.slug === slug);
  expect(place).toBeTruthy();
  return place!;
}

/** One web batch: the word was shown with this place, and the same visitor tapped it. */
async function visit(visitorId: string, term: string, placeId: string) {
  const response = await call('/v1/analytics/events', {
    method: 'POST',
    headers: { 'User-Agent': browserAgent },
    body: {
      platform: 'web',
      visitorId,
      fresh: true,
      events: [
        { type: 'search_results', term, placeIds: [placeId], locale: 'en' },
        { type: 'search_tap', term, placeId, position: 1, locale: 'en' },
      ],
    },
  });
  expect(response.status).toBe(200);
  expect(response.data.accepted).toBeGreaterThan(0);
}

/** The hourly statement, the same one the job runs: five different visitors who all picked the place make the word learned. */
export async function runPass() {
  const token = await adminToken();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const run = await call('/v1/admin/algorithm/keywords/run', { method: 'POST', token });
    expect(run.status).toBe(201);
    if (!run.data?.skipped) return run.data;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('the learned-keyword pass stayed locked');
}

export async function learnedWord(token: string, term: string) {
  const list = await call(`/v1/admin/algorithm/keywords?status=learned&q=${encodeURIComponent(term)}&limit=50`, { token });
  return (list.data.items as { term: string; placeId: string; visitors: number; pickRate: number; weight: number; status: string }[]).find((row) => row.term === term) ?? null;
}

/**
 * Seeds one learned word for `term` on the place with `slug`, waits until the pass has written it, and returns it.
 * Seeded in an active place whose name does not contain the word, and never a team keyword, so the rule can learn it.
 */
export async function seedLearnedWord(term: string, slug = 'abou-tarek') {
  const place = await placeBySlug(slug);
  const run = stamp();
  for (let visitor = 0; visitor < 5; visitor += 1) await visit(`e2e-learned-${run}-${visitor}`, term, place.id);
  await runPass();
  let row = null;
  for (let attempt = 0; attempt < 20 && !row; attempt += 1) {
    row = await learnedWord(await adminToken(), term);
    if (!row) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  expect(row).toBeTruthy();
  return { term, placeId: place.id, row: row! };
}

/** Clears one word out of the way: block then unblock deletes the row, so counts return to where they were. */
export async function forgetLearnedWord(term: string, placeId: string) {
  const token = await adminToken();
  await call('/v1/admin/algorithm/keywords/block', { method: 'POST', token, body: { term, placeId } });
  await call('/v1/admin/algorithm/keywords/unblock', { method: 'POST', token, body: { term, placeId } });
}
