import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('the English login screen matches its screenshot', { tags: ['visual'] }, async ({ app, screen }) => {
  await app.open('/login');
  await screen.getByRole('radio', 'EN').tap();
  await expect(screen.getByRole('heading', 'Sign in')).toBeVisible();
  await expect(screen.getByRole('button', 'Sign in')).toBeEnabled();
  await expect(screen).toHaveScreenshot('login.png');
});
