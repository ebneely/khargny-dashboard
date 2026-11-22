import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { call, forgetLearnedWord, learnedWord, seedLearnedWord, stamp, adminToken, viewerToken } from './learned-fixture.js';

// Decision 0007, the dashboard side. Variants covered:
// - roles: an admin (reads and writes) and a viewer (reads, no write action, and the API refuses the write)
// - languages: English and Arabic
// - states: a newly learned word (the weekly queue), promoted to a team keyword, blocked, unblocked
// - screens: the Learned words tab and the Search settings tab (the self-learning groups)

const LEARNED = '/dashboard/numbers/searches?tab=learned';
const SETTINGS = '/dashboard/numbers/searches?tab=settings';
const EVIDENCE = ['Different visitors', 'Pick rate', 'Weight vs a team keyword', 'Last tap'];

describe('learned words: the admin reviews and decides', { session: 'admin', tags: ['e2e'], serial: true }, () => {
  test('a learned word shows the evidence behind it and the team promotes, blocks and unblocks it', async ({ app, screen }) => {
    const term = `learn${stamp()}`;
    const { placeId } = await seedLearnedWord(term);
    try {
      await app.open(LEARNED);

      // What the screen is, who taught it the words, and that the check runs every hour.
      await expect(screen.getByRole('heading', 'Learned words')).toBeVisible();
      await expect(screen.getByRole('tab', 'Search terms')).toBeVisible();
      await expect(screen.getByRole('tab', 'Search settings')).toBeVisible();
      await expect(screen.getByText('Words customers taught the search', { exact: false })).toBeVisible();
      await expect(screen.getByText('The search checks for new evidence every hour.')).toBeVisible();
      await expect(screen.getByRole('radiogroup', 'Which learned words')).toBeVisible();
      await expect(screen.getByRole('radio', 'New this week')).toBeChecked();

      // The word itself, its state and the four numbers of its evidence.
      const row = screen.getByRole('listitem').filter({ hasText: term });
      await expect(row).toBeVisible();
      await expect(row.getByText('Learned', { exact: true })).toBeVisible();
      for (const label of EVIDENCE) await expect(row.getByText(label, { exact: true })).toBeVisible();
      await expect(row.getByText('5', { exact: true })).toBeVisible();

      // Promote it: the weekly queue no longer holds it, the Promoted list does, as a team keyword.
      await screen.getByRole('button', { name: `Promote to a team keyword: ${term}` }).tap();
      await expect(screen.getByText(term, { exact: true })).toHaveCount(0);
      await screen.getByRole('radio', { name: /^Promoted/ }).tap();
      const promoted = screen.getByRole('listitem').filter({ hasText: term });
      await expect(promoted).toBeVisible();
      await expect(promoted.getByText('Team keyword', { exact: true })).toBeVisible();

      // Block it for this place: it leaves the promoted list and waits in Blocked.
      await screen.getByRole('button', { name: `More actions: ${term}` }).tap();
      await screen.getByRole('menuitem', { name: 'Block for this place' }).tap();
      await expect(screen.getByText(term, { exact: true })).toHaveCount(0);
      await screen.getByRole('radio', { name: /^Blocked/ }).tap();
      const blocked = screen.getByRole('listitem').filter({ hasText: term });
      await expect(blocked).toBeVisible();
      await expect(blocked.getByText('Blocked', { exact: true })).toBeVisible();

      // Unblock lets the search learn it again: the row is deleted.
      await screen.getByRole('button', { name: `Unblock: let it be learned again: ${term}` }).tap();
      await expect(screen.getByText(term, { exact: true })).toHaveCount(0);
      expect(await learnedWord(await adminToken(), term)).toBe(null);
    } finally {
      await forgetLearnedWord(term, placeId);
    }
  });

  test('every learned word opens the place it was learned for', async ({ app, screen, browser }) => {
    const term = `open${stamp()}`;
    const { placeId } = await seedLearnedWord(term);
    try {
      await app.open(LEARNED);
      // For an admin the row's visible action is Promote; opening the place lives in its More actions menu.
      await screen.getByRole('button', { name: `More actions: ${term}` }).tap();
      await screen.getByRole('menuitem', { name: 'Open the place' }).tap();
      await expect(browser).toHaveURL(`/dashboard/places/${placeId}`, { timeout: 30_000 });
    } finally {
      await forgetLearnedWord(term, placeId);
    }
  });

  test('in Arabic the review screen and its evidence read in Arabic', async ({ app, screen }) => {
    const term = `arab${stamp()}`;
    const { placeId } = await seedLearnedWord(term);
    try {
      await app.open(LEARNED);
      await screen.getByRole('radio', 'ع').tap();
      try {
        await expect(screen.getByRole('heading', 'كلمات متعلَّمة')).toBeVisible();
        await expect(screen.getByRole('tab', 'إعدادات البحث')).toBeVisible();
        await expect(screen.getByText('مراجعة', { exact: true })).toBeVisible();
        const row = screen.getByRole('listitem').filter({ hasText: term });
        await expect(row).toBeVisible();
        for (const label of ['زوار مختلفون', 'نسبة الاختيار']) await expect(row.getByText(label, { exact: true })).toBeVisible();
        await expect(row.getByText('متعلَّمة', { exact: true })).toBeVisible();
        await expect(screen.getByRole('radio', { name: /^جديدة هذا الأسبوع/ })).toBeChecked();
      } finally {
        await screen.getByRole('radio', 'EN').tap();
        await expect(screen.getByRole('heading', 'Learned words')).toBeVisible();
      }
    } finally {
      await forgetLearnedWord(term, placeId);
    }
  });
});

describe('learned words: a viewer reads but does not decide', { session: 'viewer', tags: ['e2e'], serial: true }, () => {
  test('the viewer sees the list and its evidence, and no write action at all', async ({ app, screen }) => {
    const term = `view${stamp()}`;
    const { placeId } = await seedLearnedWord(term);
    try {
      await app.open(LEARNED);
      await expect(screen.getByRole('status').filter({ hasText: 'view-only' })).toBeVisible();
      await expect(screen.getByRole('heading', 'Learned words')).toBeVisible();
      const row = screen.getByRole('listitem').filter({ hasText: term });
      await expect(row).toBeVisible();
      await expect(row.getByText('Learned', { exact: true })).toBeVisible();
      for (const label of EVIDENCE) await expect(row.getByText(label, { exact: true })).toBeVisible();
      // Reading the place stays.
      await expect(screen.getByRole('link', { name: `Open the place: ${term}` })).toBeVisible();
      // Every write action is gone from the DOM, not merely disabled.
      await expect(screen.getByRole('button', { name: `Promote to a team keyword: ${term}` })).toHaveCount(0);
      await expect(screen.getByRole('button', { name: `More actions: ${term}` })).toHaveCount(0);
      await expect(screen.getByText('Block for this place')).toHaveCount(0);
    } finally {
      await forgetLearnedWord(term, placeId);
    }
  });

  test('the settings open read-only: no save bar, no preview', async ({ app, screen }) => {
    await app.open(SETTINGS);
    await expect(screen.getByRole('status').filter({ hasText: 'view-only' })).toBeVisible();
    await expect(screen.getByText('Learned keywords', { exact: true }).first()).toBeVisible();
    await expect(screen.getByLabel('Different visitors needed')).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Save search settings' })).toHaveCount(0);
    await expect(screen.getByRole('button', { name: 'Preview these values' })).toHaveCount(0);
  });

  test('the API refuses a viewer promoting a word and saving the settings', async () => {
    const term = `deny${stamp()}`;
    const { placeId } = await seedLearnedWord(term);
    try {
      const token = await viewerToken();
      for (const action of ['promote', 'block', 'unblock']) {
        const refused = await call(`/v1/admin/algorithm/keywords/${action}`, { method: 'POST', token, body: { term, placeId } });
        expect(refused.status).toBe(403);
      }
      const settings = await call('/v1/admin/algorithm/settings', { token });
      const save = await call('/v1/admin/algorithm/settings', { method: 'PUT', token, body: { values: settings.data.values, note: 'e2e viewer' } });
      expect(save.status).toBe(403);
      // The word is untouched and still learned.
      expect((await learnedWord(await adminToken(), term))?.status).toBe('learned');
    } finally {
      await forgetLearnedWord(term, placeId);
    }
  });
});

describe('search settings: the self-learning groups', { session: 'admin', tags: ['e2e'], serial: true }, () => {
  test('the three groups and their numbers are there, and the preview counts on the real data', async ({ app, screen }) => {
    await app.open(SETTINGS);
    for (const title of ['Learned keywords', 'Evidence and abuse', 'Website visitor ID']) {
      await expect(screen.getByText(title, { exact: true }).first()).toBeVisible();
    }
    for (const label of ['Different visitors needed', 'Pick rate needed', 'Fade after no taps for', 'Speed limit', 'Keep the visitor ID for']) {
      await expect(screen.getByLabel(label)).toBeVisible();
    }
    await expect(screen.getByRole('switch', { name: 'Learn keywords automatically' })).toBeVisible();

    // Preview writes nothing and reports what the next full pass would do.
    await screen.getByRole('button', { name: 'Preview these values' }).tap();
    for (const label of ['Learned now', 'Would be learned', 'Would be removed']) await expect(screen.getByText(label, { exact: true })).toBeVisible();
    // One save bar for the whole screen, disabled until something changes.
    await expect(screen.getByRole('button', { name: 'Save search settings' })).toBeDisabled();
  });

  test('in Arabic the three groups and the preview read in Arabic', async ({ app, screen }) => {
    await app.open(SETTINGS);
    await screen.getByRole('radio', 'ع').tap();
    try {
      for (const title of ['الكلمات المتعلَّمة', 'الأدلة ومنع التلاعب', 'معرّف زائر الموقع']) {
        await expect(screen.getByText(title, { exact: true }).first()).toBeVisible();
      }
      await expect(screen.getByText('معاينة هذه القيم', { exact: true })).toBeVisible();
    } finally {
      await screen.getByRole('radio', 'EN').tap();
      await expect(screen.getByText('Website visitor ID', { exact: true }).first()).toBeVisible();
    }
  });
});
