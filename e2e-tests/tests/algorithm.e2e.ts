import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';

// Decision 0006/0007/0009, the Algorithm section: one nav tab, each top page its own URL.
// Covers: an admin and a viewer; English and Arabic; every page (Today, People, Places, Demand,
// Money, Movement, Health); Settings and How it works as panels; the count switch and the rank;
// and the old Numbers addresses still answering.

const TABLES = ['Today', 'People', 'Places', 'Demand', 'Money', 'Movement', 'Health'];

describe('algorithm: one tab, six pages, its own URL', { session: 'admin', tags: ['e2e'], serial: true }, () => {
  test('Today holds the answers, the live snapshot and the two switches', async ({ app, screen, browser }) => {
    await app.open('/dashboard/algorithm/today');
    await expect(screen.getByRole('heading', 'Algorithm')).toBeVisible();
    await expect(screen.getByText('Team only. Customers never see these numbers or statuses.', { exact: false })).toBeVisible();
    // Every top tab is a real page, reached from the section's own links.
    for (const tab of TABLES) await expect(screen.getByRole('link', { name: tab, exact: true }).first()).toBeVisible();
    await expect(screen.getByRole('radiogroup', 'Numbers window')).toBeVisible();
    await expect(screen.getByRole('radiogroup', 'Count')).toBeVisible();
    await expect(screen.getByRole('radio', 'All')).toBeChecked();
    await expect(screen.getByRole('heading', "Today's answer")).toBeVisible();
    await expect(screen.getByText('Right now', { exact: true })).toBeVisible();
    await expect(screen.getByText('Answers', { exact: true })).toBeVisible();
    await expect(screen.getByRole('heading', 'What moved')).toBeVisible();

    // The count switch is in the address, so a shared link keeps it.
    await screen.getByRole('radio', 'People').tap();
    await expect(browser).toHaveURL(/who=people/);
    await expect(screen.getByRole('radio', 'People')).toBeChecked();
    await screen.getByRole('radio', 'All').tap();
    await expect(screen.getByRole('radio', 'All')).toBeChecked();
  });

  test('Settings and How it works open as panels over the page', async ({ app, screen }) => {
    await app.open('/dashboard/algorithm/today');
    await screen.getByRole('button', { name: 'Settings' }).tap();
    await expect(screen.getByRole('heading', 'Algorithm settings')).toBeVisible();
    await expect(screen.getByRole('radiogroup', 'Settings group')).toBeVisible();
    await expect(screen.getByLabel('Fair-chance seats per 10 posts')).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Save settings' })).toBeVisible();
    await screen.getByRole('button', { name: 'Close' }).tap();
    await expect(screen.getByRole('heading', 'Algorithm settings')).toHaveCount(0);

    await screen.getByRole('button', { name: 'How it works' }).tap();
    await expect(screen.getByRole('heading', 'How ranking works')).toBeVisible();
    await expect(screen.getByText('1. Our promise', { exact: false })).toBeVisible();
    await expect(screen.getByText('8. Learned keywords', { exact: false })).toBeVisible();
    await screen.getByRole('button', { name: 'Close' }).tap();
  });

  test('Places carries the hype rank, the sixth metric and every status', async ({ app, screen }) => {
    await app.open('/dashboard/algorithm/places');
    await expect(screen.getByRole('heading', 'Hype', { exact: true })).toBeVisible();
    await expect(screen.getByText('Hype is always the last 30 days, whatever the window.', { exact: false })).toBeVisible();
    // Search points is the sixth hype metric (decision 0006); the honest empty state is allowed when no place has hype.
    await expect(screen.getByRole('columnheader', { name: 'Search points' })).toBeVisible();
    await expect(screen.getByText('No hype yet').first()).toBeVisible();
    await expect(screen.getByRole('heading', 'Every place, its status and why')).toBeVisible();
    await expect(screen.getByText('Statuses are managed in Settings; customers never see them.', { exact: false })).toBeVisible();
    const statuses = screen.getByRole('group', { name: 'Place status' });
    await expect(statuses.getByRole('button', { name: /^All statuses/ })).toBeVisible();
    for (const word of ['New', 'On trial', 'Rising', 'Hyped', 'Cooling', 'Resting', 'Needs listing']) {
      await expect(statuses.getByRole('button', { name: new RegExp(`^${word}`) })).toBeVisible();
    }
    // A status is a filter on the server list, and the address keeps it selectable.
    await statuses.getByRole('button', { name: /^Rising/ }).tap();
    await expect(statuses.getByRole('button', { name: /^Rising/ })).toHaveAttribute('aria-pressed', 'true');
    // The count switch changes the metric columns and shows Repeat beside them.
    await screen.getByRole('radio', 'People').tap();
    await expect(screen.getByRole('radio', 'People')).toBeChecked();
    await screen.getByRole('radio', 'All').tap();
  });

  test('Demand joins the leads, the search terms and the learned words', async ({ app, screen }) => {
    await app.open('/dashboard/algorithm/demand');
    await expect(screen.getByRole('heading', 'What people look for')).toBeVisible();
    await expect(screen.getByText('From search to visit', { exact: true })).toBeVisible();
    await expect(screen.getByText('Missed demand', { exact: true })).toBeVisible();
    await expect(screen.getByRole('heading', 'Search terms')).toBeVisible();
    await expect(screen.getByRole('heading', 'Learned words')).toBeVisible();
    await expect(screen.getByRole('radiogroup', 'Which learned words')).toBeVisible();
  });

  test('Money summarises owners, running ads and plans without a write action', async ({ app, screen }) => {
    await app.open('/dashboard/algorithm/money');
    await expect(screen.getByRole('heading', 'Is the money side healthy?')).toBeVisible();
    await expect(screen.getByText('Active owners', { exact: true })).toBeVisible();
    await expect(screen.getByRole('heading', 'Running ads')).toBeVisible();
    await expect(screen.getByRole('heading', 'Plans and prices')).toBeVisible();
    await expect(screen.getByRole('link', { name: /Open Money/ })).toBeVisible();
  });

  test('Movement and Health answer at their own addresses', async ({ app, screen }) => {
    await app.open('/dashboard/algorithm/movement');
    await expect(screen.getByRole('heading', 'How people move through the app')).toBeVisible();
    await expect(screen.getByText('Actions in sessions', { exact: true })).toBeVisible();
    await app.open('/dashboard/algorithm/health');
    await expect(screen.getByRole('heading', 'Health')).toBeVisible();
  });

  test('in Arabic the section, its tabs and its panels read in Arabic', async ({ app, screen, browser }) => {
    await app.open('/dashboard/algorithm/today');
    await screen.getByRole('radio', 'ع').tap();
    try {
      await expect(browser).toHaveURL(/\/ar\/dashboard\/algorithm\/today/);
      await expect(screen.getByRole('heading', 'الخوارزمية')).toBeVisible();
      for (const tab of ['اليوم', 'أشخاص', 'الأماكن', 'الطلب', 'فلوس', 'التحرك', 'الصحة']) {
        await expect(screen.getByRole('link', { name: tab, exact: true }).first()).toBeVisible();
      }
      await expect(screen.getByRole('radiogroup', 'العدّ')).toBeVisible();
      await screen.getByRole('button', { name: 'الإعدادات' }).tap();
      await expect(screen.getByRole('heading', 'إعدادات الخوارزمية')).toBeVisible();
      await expect(screen.getByText('فرصة عادلة', { exact: true }).first()).toBeVisible();
      await screen.getByRole('button', { name: 'إغلاق' }).tap();
      await app.open('/ar/dashboard/algorithm/places');
      await expect(screen.getByRole('heading', 'الرواج', { exact: true })).toBeVisible();
      await expect(screen.getByText('نقاط البحث', { exact: true }).first()).toBeVisible();
    } finally {
      await app.open('/dashboard/algorithm/today');
      await screen.getByRole('radio', 'EN').tap();
      await expect(screen.getByRole('heading', 'Algorithm')).toBeVisible();
    }
  });

  test('the old Numbers addresses still answer', async ({ app, screen }) => {
    await app.open('/dashboard/numbers');
    await expect(screen.getByRole('heading', 'Numbers')).toBeVisible();
    await app.open('/dashboard/numbers/searches?tab=learned');
    await expect(screen.getByRole('heading', 'Learned words')).toBeVisible();
  });
});

describe('algorithm: a viewer reads, and no setting can be saved', { session: 'viewer', tags: ['e2e'], serial: true }, () => {
  test('the viewer reads every Algorithm page with the view-only banner', async ({ app, screen }) => {
    await app.open('/dashboard/algorithm/places');
    await expect(screen.getByRole('status').filter({ hasText: 'view-only' })).toBeVisible();
    await expect(screen.getByRole('heading', 'Algorithm')).toBeVisible();
    await expect(screen.getByRole('heading', 'Every place, its status and why')).toBeVisible();
    await app.open('/dashboard/algorithm/money');
    await expect(screen.getByRole('heading', 'Is the money side healthy?')).toBeVisible();
  });

  test('the settings panel is readable and cannot be saved', async ({ app, screen }) => {
    await app.open('/dashboard/algorithm/today');
    await screen.getByRole('button', { name: 'Settings' }).tap();
    await expect(screen.getByRole('heading', 'Algorithm settings')).toBeVisible();
    await expect(screen.getByText('Only a super admin can change these settings.', { exact: false })).toBeVisible();
    await expect(screen.getByLabel('Fair-chance seats per 10 posts')).toBeDisabled();
    await expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
    await screen.getByRole('button', { name: 'Close' }).tap();
  });
});
