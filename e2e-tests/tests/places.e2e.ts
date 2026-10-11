import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { categoryTest, removeCategory } from './category-fixture.js';

test('the places list shows the seeded places', { session: 'admin' }, async ({ app, screen }) => {
  await app.open('/dashboard/places');
  await expect(screen.getByRole('heading', 'Places')).toBeVisible();
  const table = screen.getByRole('table');
  for (const name of [
    'Giza Pyramids',
    'Egyptian Museum',
    'Abou Tarek',
    'Bibliotheca Alexandrina',
    'e2e-inactive-place',
    'e2e-pending-media-place',
    'e2e-no-media-place',
  ]) {
    await expect(table.getByRole('link', new RegExp(`^${name}(?:\\s|$)`))).toBeVisible();
  }
  await expect(table.getByRole('link', 'e2e-deleted-place')).toHaveCount(0);
});

describe('category create-and-remove round trip', { session: 'admin' }, () => {
  categoryTest.afterEach(removeCategory);

  categoryTest('creates a category without uploading a file', async ({ app, screen, browser, categoryName }) => {
    await app.open('/dashboard');
    await screen.getByRole('navigation', 'Dashboard').getByRole('link', 'Categories').tap();
    await expect(screen.getByRole('heading', 'Categories')).toBeVisible();
    await screen.getByRole('button', 'Add Category').first().tap();
    await expect(screen.getByRole('heading', 'New Category')).toBeVisible();
    await screen.getByLabel('Name (Arabic) *').fill(categoryName);
    await screen.getByLabel('Name (English) *').fill(categoryName);
    await screen.getByLabel('Slug *').fill(categoryName);
    await screen.getByRole('button', 'Save changes').tap();
    await expect(browser).toHaveURL('/dashboard/categories', { timeout: 60_000 });
    const row = screen.getByRole('row').filter({ has: screen.getByRole('cell', categoryName) });
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell', 'Active')).toBeVisible();
  });
});
