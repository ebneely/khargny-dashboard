import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { adminCredentials } from './admin-credentials.js';

// Variants covered (khargny-dashboard#33, khargny-backend#48):
// - traffic: an app search (X-Client-Type, no platform) and a browser search (no platform)
// - overview: periods 7, 30, 90 and custom; platform filter all, app, web (and a stale ?platform=unknown);
//   city filter; English and Arabic
// - live: every window from 1 minute to 24 hours; places with a photo, with no photo,
//   deleted after the view, and merged after the view

const api = process.env.E2E_API_URL ?? 'http://localhost:3110';
const browserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) e2e-analytics';
const windows = ['1m', '5m', '15m', '30m', '1h', '3h', '6h', '12h', '24h'];
const tiles = ['Views', 'Saves', '5argny taps', 'Likes', 'Live places', 'Cities', 'Areas', 'Categories', 'Drafts'];

// One sign-in for the file: the stack runs production rate limits (100 requests a minute).
let cachedToken: Promise<string> | undefined;
function adminToken() {
  cachedToken ??= signIn();
  return cachedToken;
}

async function signIn() {
  const login = await fetch(`${api}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminCredentials.username, password: adminCredentials.password }),
  });
  return (await login.json()).data.access_token as string;
}

async function adminCall(token: string, path: string, method = 'POST', body?: unknown) {
  const response = await fetch(`${api}/v1/admin${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  expect(response.ok).toBe(true);
  return response.json();
}

async function seededPlace(token: string, slug: string) {
  const list = await adminCall(token, `/places?search=${encodeURIComponent(slug)}&limit=20`, 'GET');
  return (list.data?.data ?? list.data).find((place: { slug: string }) => place.slug === slug) as { id: string };
}

async function viewPlace(placeId: string) {
  const event = await fetch(`${api}/v1/analytics/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': browserAgent },
    body: JSON.stringify({ platform: 'web', events: [{ type: 'place_view', placeId, path: '/place/e2e' }] }),
  });
  expect(event.ok).toBe(true);
}

// Neither client sends `platform`: the app is known by X-Client-Type, anything else is the website.
async function searchAs(client: 'app' | 'web', term: string, cityId?: string, device = 'e2e-analytics-device-01') {
  const response = await fetch(`${api}/v1/search/places?q=${encodeURIComponent(term)}&settled=1${cityId ? `&cityId=${cityId}` : ''}`, {
    headers: client === 'app'
      ? { 'User-Agent': 'okhttp/4.12.0', 'X-Client-Type': 'mobile-app', 'X-Device-Id': device }
      : { 'User-Agent': browserAgent },
  });
  expect(response.ok).toBe(true);
}

async function livePlace(token: string, id: string, window = '24h') {
  const top = await adminCall(token, `/analytics/live/top?window=${window}`, 'GET');
  return (top.data?.places ?? []).find((place: { id: string }) => place.id === id) ?? null;
}

describe('analytics overview', { session: 'admin', tags: ['e2e', 'api'] }, () => {
  test('app and web traffic land as App and Web with the insights summary, in every period', async ({ app, screen }) => {
    await searchAs('app', 'pyramids');
    await searchAs('web', 'museum');
    for (const [period, label] of [['7', 'Last 7 days'], ['30', 'Last 30 days'], ['90', 'Last 90 days'], ['custom', 'Custom range']]) {
      await app.open(`/dashboard/analytics?period=${period}`);
      await expect(screen.getByRole('radio', label)).toBeChecked();
      const insights = screen.getByRole('region', 'Insights');
      await expect(insights.getByText('What visitors are doing across the catalogue.')).toBeVisible();
      for (const tile of tiles) await expect(insights.getByText(tile, { exact: true })).toBeVisible();
      await expect(screen.getByText('Sessions by day')).toBeVisible();
      await expect(screen.getByRole('img', 'App').first()).toBeVisible();
      await expect(screen.getByRole('img', 'Web').first()).toBeVisible();
      // Likes per day further down keeps its calendar icons; only session rows changed.
      await expect(screen.getByRole('listitem').filter({ hasText: 'Sessions' }).getByRole('img', 'Day or period')).toHaveCount(0);
      await expect(screen.getByText('Unknown platform')).toHaveCount(0);
    }
  });

  test('the platform filter offers only App and Web, and each shows only its own rows', async ({ app, screen }) => {
    await searchAs('app', 'pyramids');
    await searchAs('web', 'museum');
    await app.open('/dashboard/analytics');
    await screen.getByRole('combobox', 'All platforms').tap();
    await expect(screen.getByRole('option', 'App')).toBeVisible();
    await expect(screen.getByRole('option', 'Web')).toBeVisible();
    await expect(screen.getByRole('option', 'Unknown platform')).toHaveCount(0);
    for (const [platform, shown, hidden] of [['app', 'App', 'Web'], ['web', 'Web', 'App']]) {
      await app.open(`/dashboard/analytics?platform=${platform}`);
      await expect(screen.getByRole('img', shown).first()).toBeVisible();
      await expect(screen.getByRole('img', hidden)).toHaveCount(0);
    }
    // An old link with the removed bucket falls back to all platforms.
    await app.open('/dashboard/analytics?platform=unknown');
    await expect(screen.getByRole('img', 'App').first()).toBeVisible();
    await expect(screen.getByRole('img', 'Web').first()).toBeVisible();
  });

  test('the city filter keeps only sessions in that city; the summary stays catalogue-wide', async ({ app, screen }) => {
    const cities = await (await fetch(`${api}/v1/cities`)).json();
    const cairo = (cities.data as { id: string; slug: string }[]).find((city) => city.slug === 'cairo')!;
    await searchAs('app', 'pyramids', cairo.id, 'e2e-analytics-city-device-01');
    await searchAs('web', 'museum');
    await app.open(`/dashboard/analytics?cityId=${cairo.id}`);
    for (const tile of tiles) await expect(screen.getByRole('region', 'Insights').getByText(tile, { exact: true })).toBeVisible();
    await expect(screen.getByRole('img', 'App').first()).toBeVisible();
    await expect(screen.getByRole('img', 'Web')).toHaveCount(0);
  });

  test('in Arabic the summary, the tiles and the platform icons read in Arabic', async ({ app, screen }) => {
    await searchAs('app', 'pyramids');
    await searchAs('web', 'museum');
    await app.open('/dashboard/analytics');
    await screen.getByRole('radio', 'ع').tap();
    try {
      const insights = screen.getByRole('region', 'الإحصاءات');
      await expect(insights.getByText('نشاط الزوار في دليل الأماكن.')).toBeVisible();
      for (const tile of ['المناطق', 'المسودات', 'الأماكن المنشورة']) await expect(insights.getByText(tile, { exact: true })).toBeVisible();
      await expect(screen.getByRole('img', 'التطبيق').first()).toBeVisible();
      await expect(screen.getByRole('img', 'الموقع').first()).toBeVisible();
      await expect(screen.getByText('منصة غير معروفة')).toHaveCount(0);
    } finally {
      await screen.getByRole('radio', 'EN').tap();
      await expect(screen.getByRole('region', 'Insights')).toBeVisible();
    }
  });
});

describe('live top places', { session: 'admin', tags: ['e2e', 'api'] }, () => {
  test('a viewed place carries its photo in every live window', async ({ app, screen }) => {
    const token = await adminToken();
    const place = await seededPlace(token, 'biblioteca-alexandrina');
    await viewPlace(place.id);
    for (const window of windows) expect((await livePlace(token, place.id, window))?.cover ?? '').toContain('data:image/svg+xml');
    // The page renders every window the same way; open the shortest and the longest.
    for (const window of ['1m', '24h']) {
      await app.open(`/dashboard/analytics/live?window=${window}`);
      await expect(screen.getByText('Bibliotheca Alexandrina').first()).toBeVisible();
    }
  });

  // Ingest only accepts places with an approved photo, so each state below is reached after
  // the view, the way it happens in production: the photo is removed, the place is deleted,
  // or it is merged. Deletion is undone; the photo removal and the merge are not, and the
  // e2e stack reseeds on every start (no other test reads Egyptian Museum's photo or Hidden Draft).
  test('a place whose photo was removed after the view shows its name with the placeholder', async ({ app, screen }) => {
    const token = await adminToken();
    const place = await seededPlace(token, 'egyptian-museum');
    await viewPlace(place.id);
    const media = await adminCall(token, `/media/place/${place.id}`, 'GET');
    for (const image of media.data.images as { id: string }[]) await adminCall(token, `/media/${image.id}/image`, 'DELETE');
    const row = await livePlace(token, place.id);
    expect(row?.cover ?? null).toBe(null);
    expect(row?.deleted).toBe(false);
    await app.open('/dashboard/analytics/live?window=24h');
    await expect(screen.getByText('Egyptian Museum').first()).toBeVisible();
    await expect(screen.getByText(place.id)).toHaveCount(0);
  });

  test('a place deleted after the view shows its name flagged, never its id', async ({ app, screen }) => {
    const token = await adminToken();
    const place = await seededPlace(token, 'e2e-inactive-place');
    await adminCall(token, `/places/${place.id}/activate`);
    try {
      await viewPlace(place.id);
      await adminCall(token, `/places/${place.id}`, 'DELETE');
      expect((await livePlace(token, place.id))?.deleted).toBe(true);
      await app.open('/dashboard/analytics/live?window=24h');
      await expect(screen.getByText('e2e-inactive-place')).toBeVisible();
      await expect(screen.getByText('Deleted place')).toBeVisible();
      await expect(screen.getByText(place.id)).toHaveCount(0);
    } finally {
      await fetch(`${api}/v1/admin/places/${place.id}/restore`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      await fetch(`${api}/v1/admin/places/${place.id}/deactivate`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
    }
  });

  test('a place merged after the view reads as its survivor', async ({ app, screen }) => {
    const token = await adminToken();
    const source = await seededPlace(token, 'hidden-draft');
    const survivor = await seededPlace(token, 'abou-tarek');
    await adminCall(token, `/places/${source.id}/activate`);
    await viewPlace(source.id);
    const plan = await adminCall(token, `/places/${source.id}/merge`, 'POST', { intoId: survivor.id, dryRun: true });
    await adminCall(token, `/places/${source.id}/merge`, 'POST', { intoId: survivor.id, dryRun: false, planDigest: plan.data.planDigest });
    const row = await livePlace(token, source.id);
    expect(row?.nameEn).toBe('Abou Tarek');
    expect(row?.deleted).toBe(false);
    expect(row?.cover ?? '').toContain('data:image/svg+xml');
    await app.open('/dashboard/analytics/live?window=24h');
    await expect(screen.getByText('Abou Tarek').first()).toBeVisible();
    await expect(screen.getByText('Hidden Draft')).toHaveCount(0);
    await expect(screen.getByText(source.id)).toHaveCount(0);
  });
});
