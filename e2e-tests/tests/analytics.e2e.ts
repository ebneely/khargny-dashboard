import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { adminCredentials } from './admin-credentials.js';

const api = process.env.E2E_API_URL ?? 'http://localhost:3110';

// One search from the app (it marks every request with X-Client-Type) and one from a browser,
// neither sending `platform`: both must land as App and Web, never as a third bucket.
async function adminToken() {
  const login = await fetch(`${api}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminCredentials.username, password: adminCredentials.password }),
  });
  return (await login.json()).data.access_token as string;
}

async function viewPlace(placeId: string) {
  const event = await fetch(`${api}/v1/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) e2e-analytics' },
    body: JSON.stringify({ platform: 'web', events: [{ type: 'place_view', placeId, path: '/place/e2e' }] }),
  });
  expect(event.ok).toBe(true);
}

async function searchAs(client: 'app' | 'web', term: string) {
  const response = await fetch(`${api}/v1/search/places?q=${encodeURIComponent(term)}&settled=1`, {
    headers: client === 'app'
      ? { 'User-Agent': 'okhttp/4.12.0', 'X-Client-Type': 'mobile-app', 'X-Device-Id': 'e2e-analytics-device-01' }
      : { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) e2e-analytics' },
  });
  expect(response.ok).toBe(true);
}

test('the analytics overview shows the insights summary and app or web day rows', { session: 'admin', tags: ['e2e', 'api'] }, async ({ app, screen }) => {
  await searchAs('app', 'pyramids');
  await searchAs('web', 'museum');
  await app.open('/dashboard/analytics');
  const insights = screen.getByRole('region', 'Insights');
  await expect(insights.getByText('What visitors are doing across the catalogue.')).toBeVisible();
  for (const label of ['Views', 'Saves', '5argny taps', 'Likes', 'Live places', 'Cities', 'Areas', 'Categories', 'Drafts']) {
    await expect(insights.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(screen.getByText('Sessions by day')).toBeVisible();
  await expect(screen.getByRole('img', 'App').first()).toBeVisible();
  await expect(screen.getByRole('img', 'Web').first()).toBeVisible();
  await expect(screen.getByRole('img', 'Day or period')).toHaveCount(0);
  await expect(screen.getByText('Unknown platform')).toHaveCount(0);
});

test('live top places carry a cover photo', { session: 'admin', tags: ['e2e', 'api'] }, async ({ app, screen }) => {
  const token = await adminToken();
  const places = await (await fetch(`${api}/v1/places?limit=20`)).json();
  const viewed = (places.data?.data ?? places.data).find((place: { coverImage?: string | null }) => place.coverImage);
  await viewPlace(viewed.id);
  await expect.poll(async () => {
    const top = await (await fetch(`${api}/v1/admin/analytics/live/top?window=24h`, { headers: { Authorization: `Bearer ${token}` } })).json();
    return (top.data?.places ?? []).find((place: { id: string }) => place.id === viewed.id)?.cover ?? null;
  }).toBe(viewed.coverImage);
  await app.open('/dashboard/analytics/live?window=24h');
  await expect(screen.getByText('Top places')).toBeVisible();
});

// A place viewed and then deleted stays in the live window: it shows its name with a
// "Deleted place" chip, never its raw id. Uses the seed's Hidden Draft, which no other
// dashboard test reads, and hides it again afterwards (restore, then deactivate).
test('a deleted place in live top places shows its name, flagged, not its id', { session: 'admin', tags: ['e2e', 'api'] }, async ({ app, screen }) => {
  const token = await adminToken();
  const admin = (path: string, method = 'POST') => fetch(`${api}/v1/admin/places${path}`, { method, headers: { Authorization: `Bearer ${token}` } });
  const list = await (await fetch(`${api}/v1/admin/places?search=Hidden%20Draft&limit=10`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const draft = (list.data?.data ?? list.data).find((place: { slug: string }) => place.slug === 'hidden-draft');
  expect((await admin(`/${draft.id}/activate`)).ok).toBe(true);
  try {
    await viewPlace(draft.id);
    expect((await admin(`/${draft.id}`, 'DELETE')).ok).toBe(true);
    await app.open('/dashboard/analytics/live?window=24h');
    await expect(screen.getByText('Hidden Draft')).toBeVisible();
    await expect(screen.getByText('Deleted place')).toBeVisible();
    await expect(screen.getByText(draft.id)).toHaveCount(0);
  } finally {
    await admin(`/${draft.id}/restore`);
    await fetch(`${api}/v1/admin/places/${draft.id}/deactivate`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  }
});
