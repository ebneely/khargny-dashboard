import { randomUUID } from 'node:crypto';
import { test } from '@e2e-dev/web';
import { expect, type TestFixtures } from 'e2e';

export const categoryTest = test.extend<{ categoryName: string }>({
  categoryName: async (_fixtures, use) => {
    await use(`e2e-category-${randomUUID()}`);
  },
});

export async function removeCategory({ app, screen, categoryName }: Pick<TestFixtures, 'app' | 'screen'> & { categoryName: string }) {
  await app.open(`/dashboard/categories?categories-q=${encodeURIComponent(categoryName)}`);
  await expect(screen.getByRole('heading', 'Categories')).toBeVisible();
  const row = screen.getByRole('row').filter({ has: screen.getByRole('cell', categoryName) });
  const empty = screen.getByText('No categories match your search.');
  await expect.poll(async () => (await row.count()) + (await empty.count())).toBe(1);
  if (await empty.isVisible()) return;

  await row.getByRole('button', `More actions: ${categoryName}`).tap();
  await screen.getByRole('menuitem', 'Delete').tap();
  const dialog = screen.getByRole('dialog', `Delete ${categoryName}?`);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', 'Delete').tap();
  await expect(dialog).not.toBeVisible();
  await expect(row).toHaveCount(0);
  await expect(empty).toBeVisible();
  await app.open(`/dashboard/categories?categories-q=${encodeURIComponent(categoryName)}`);
  await expect(empty).toBeVisible();
  await expect(row).toHaveCount(0);
}
