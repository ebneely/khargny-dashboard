import { describe } from '@e2e-dev/web';
import { expect, unique } from 'e2e';
import { categoryTest, removeCategory } from './category-fixture.js';

describe('admin category operator', { session: 'admin', agent: 'admin' }, () => {
  categoryTest.afterEach(removeCategory);

  categoryTest('creates a category through the agent', {
    skip: process.env.E2E_MODEL === undefined ? 'Set E2E_MODEL=<provider>:<model id> to run the admin agent.' : false,
  }, async ({ app, screen, agent, categoryName }) => {
    await app.open('/dashboard/categories');
    await agent.act('Create a top-level category using Add Category. Set Name (Arabic) *, Name (English) * and Slug * to {name}. Leave Icon, Parent category, Sort order and Status at their defaults and save with Save changes. Do not change any existing record.', {
      params: { name: unique(categoryName) },
    });
    const row = screen.getByRole('row').filter({ has: screen.getByRole('cell', categoryName) });
    await expect(row).toBeVisible();
    await expect(row.getByRole('cell', 'Active')).toBeVisible();
  });
});
