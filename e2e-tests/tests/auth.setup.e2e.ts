import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test.setup('authenticate as admin', { sessions: ['admin'] }, async ({ app, screen, browser, session }) => {
  const admin = credentials.user('admin');
  await app.open('/login');
  await screen.getByRole('radio', 'EN').tap();
  await screen.getByLabel('Email').fill(admin.username);
  await screen.getByLabel('Password').fill(admin.password);
  await screen.getByRole('button', 'Sign in').tap();
  await expect(browser).toHaveURL('/dashboard', { timeout: 60_000 });
  await expect(screen.getByRole('heading', 'Insights')).toBeVisible();
  await session.save('admin');
});
