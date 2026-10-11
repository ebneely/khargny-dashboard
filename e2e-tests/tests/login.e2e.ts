import { test } from '@e2e-dev/web';
import { credentials, expect } from 'e2e';

test('a wrong password shows the error and keeps the login screen', async ({ app, screen, browser }) => {
  const invalidAdmin = credentials.user('invalidAdmin');
  await app.open('/login');
  await screen.getByRole('radio', 'EN').tap();
  await screen.getByLabel('Email').fill(invalidAdmin.username);
  await screen.getByLabel('Password').fill(invalidAdmin.password);
  await screen.getByRole('button', 'Sign in').tap();
  await expect(screen.getByRole('alert').filter({ hasText: 'Invalid credentials' })).toHaveText('Invalid credentials');
  await expect(browser).toHaveURL('/login');
  await expect(screen.getByRole('heading', 'Sign in')).toBeVisible();
  await expect(screen.getByRole('button', 'Sign in')).toBeEnabled();
});
