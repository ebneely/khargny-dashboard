import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('the place SEO tab shows the score, fixes, positions and Google snippet', { session: 'admin' }, async ({ app, screen }) => {
  await app.open('/dashboard/places');
  const table = screen.getByRole('table');
  await table.getByRole('link', /^Giza Pyramids/).tap();
  await screen.getByRole('tab', 'SEO').tap();

  await expect(screen.getByRole('heading', 'SEO score')).toBeVisible();
  await expect(screen.getByRole('heading', 'Health checks')).toBeVisible();
  await expect(screen.getByRole('heading', 'Google positions')).toBeVisible();
  await expect(screen.getByRole('heading', 'Google snippet preview')).toBeVisible();
  await expect(screen.getByRole('button', 'Check now')).toBeVisible();
  await expect(screen.getByText('Name + 5argny · Khargny · خرجني')).toBeVisible();
});

test('the Places SEO view lists every place weakest first and opens the SEO tab', { session: 'admin' }, async ({ app, screen, browser }) => {
  await app.open('/dashboard/places/seo');
  await expect(screen.getByRole('heading', 'SEO')).toBeVisible();
  await expect(screen.getByText('Score, weakest first')).toBeVisible();
  const firstOpen = screen.getByRole('link', { name: 'Open SEO' }).first();
  await firstOpen.tap();
  await expect(browser).toHaveURL(/tab=seo/);
  await expect(screen.getByRole('heading', 'SEO score')).toBeVisible();
});
