import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { adminToken, call, VIEWER } from './learned-fixture.js';

// Decision 0007: the review screen has to be proven for the viewer role too. A viewer is a real account in the team,
// made through the admin API (the same path the Team screen uses); nothing about the app is faked.
test.setup('authenticate as viewer', { sessions: ['viewer'] }, async ({ app, screen, browser, session }) => {
  const token = await adminToken();
  const created = await call('/v1/admin/admins', {
    method: 'POST', token,
    body: { email: VIEWER.email, password: VIEWER.password, role: 'viewer' },
  });
  // 409 when an earlier run already made it; either way the account exists with this password.
  expect([200, 201, 409]).toContain(created.status);

  await app.open('/login');
  await screen.getByRole('radio', 'EN').tap();
  await screen.getByLabel('Email').fill(VIEWER.email);
  await screen.getByLabel('Password').fill(VIEWER.password);
  await screen.getByRole('button', 'Sign in').tap();
  await expect(browser).toHaveURL('/dashboard', { timeout: 60_000 });
  await expect(screen.getByRole('status').filter({ hasText: 'view-only' })).toBeVisible();
  await session.save('viewer');
});
