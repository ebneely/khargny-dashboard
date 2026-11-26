import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('the place SEO tab shows the score, fixes, positions and Google snippet', { session: 'admin' }, async ({ app, screen }) => {
  await app.open('/dashboard/places');
  const table = screen.getByRole('table');
  await table.getByRole('link', /^Giza Pyramids/).tap();
  await screen.getByRole('tab', 'SEO').tap();

  await expect(screen.getByText('SEO score', { exact: true })).toBeVisible();
  await expect(screen.getByText('Health checks', { exact: true })).toBeVisible();
  await expect(screen.getByText('Google positions', { exact: true })).toBeVisible();
  await expect(screen.getByText('Google snippet preview', { exact: true })).toBeVisible();
  await expect(screen.getByRole('button', 'Check now')).toBeVisible();
  await expect(screen.getByText('Name + 5argny · Khargny · خرجني', { exact: true })).toBeVisible();
  await expect(screen.getByRole('button', 'Save changes')).toHaveCount(0);
});

test('the Places SEO view lists every place weakest first and opens the SEO tab', { session: 'admin' }, async ({ app, screen, browser }) => {
  await app.open('/dashboard/places/seo');
  await expect(screen.getByRole('heading', 'SEO')).toBeVisible();
  await expect(screen.getByText('Score, weakest first')).toBeVisible();
  const firstOpen = screen.getByRole('button', { name: 'Open SEO' }).first();
  await firstOpen.tap();
  await expect(browser).toHaveURL(/tab=seo/);
  await expect(screen.getByText('SEO score', { exact: true })).toBeVisible();
});
