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
  // The signed-in shell, whatever the home page is called: the grouped sidebar and the admin's own menu.
  await expect(screen.getByRole('navigation', 'Dashboard')).toBeVisible();
  await expect(screen.getByRole('button', { name: /Super admin/ })).toBeVisible();
  await session.save('admin');
});
