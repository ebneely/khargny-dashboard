import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

const api = process.env.E2E_API_URL ?? 'http://localhost:3110';

// One search from the app (it marks every request with X-Client-Type) and one from a browser,
// neither sending `platform`: both must land as App and Web, never as a third bucket.
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
  await expect(screen.getByRole('heading', 'Sessions by day')).toBeVisible();
  await expect(screen.getByRole('img', 'App').first()).toBeVisible();
  await expect(screen.getByRole('img', 'Web').first()).toBeVisible();
  await expect(screen.getByRole('img', 'Day or period')).toHaveCount(0);
  await expect(screen.getByText('Unknown platform')).toHaveCount(0);
});
