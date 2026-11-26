import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { adminCredentials } from './admin-credentials.js';
import { call, signIn } from './learned-fixture.js';

/**
 * Moods page (PLACES-DIRECTION §5): the eight seeds, their order, the editor with its live
 * preview, and a save that survives a reload. The one weight it changes is set through the
 * API to a known state first and restored in `finally`, so a run always ends where it started.
 */
interface MoodRow {
  id: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  weights: { tags: Record<string, number>; amenities: Record<string, number>; categories: Record<string, number> };
}

async function chillAndModern() {
  const token = await signIn(adminCredentials.username, adminCredentials.password);
  const moods = (await call('/v1/admin/moods', { token })).data.data as MoodRow[];
  const chill = moods.find((mood) => mood.slug === 'chill');
  const tags = (await call('/v1/admin/tags?limit=200', { token })).data as { data: { id: string; nameEn: string | null }[] };
  const modern = tags.data.find((tag) => tag.nameEn === 'Modern');
  expect(Boolean(chill && modern)).toBe(true);
  return { token, chill: chill!, modernId: modern!.id };
}

test.describe('moods: the dashboard page', { session: 'admin', tags: ['e2e'], serial: true }, () => {
  test('should list the eight moods and their top places', async ({ app, screen }) => {
    await app.open('/dashboard/moods');
    await expect(screen.getByRole('heading', { name: 'Moods', level: 1 })).toBeVisible();
    for (const name of ['Chill', 'Date night', 'With family', 'With friends', 'Work & study', 'Hungry', 'Adventure', 'Celebrate'])
      await expect(screen.getByText(name, { exact: true }).first()).toBeVisible();
    await expect(screen.getByText('Records: 8')).toBeVisible();
    await expect(screen.getByText('am pm speciality coffee')).toBeVisible();
  });

  test('should edit a weight, see it live, save it, and keep it after a reload', async ({ app, screen }) => {
    const { token, chill, modernId } = await chillAndModern();
    const original = chill.weights;
    const without = { ...original, tags: { ...original.tags } };
    delete without.tags[modernId];
    try {
      const reset = await call(`/v1/admin/moods/${chill.id}`, { method: 'PATCH', token, body: { weights: without } });
      expect(reset.status).toBe(200);

      await app.open('/dashboard/moods');
      await screen.getByRole('button', { name: 'Edit mood: Chill' }).click();
      await expect(screen.getByRole('heading', { name: 'Edit mood' })).toBeVisible();
      await expect(screen.getByRole('button', { name: /^Modern, weight 0$/ })).toBeVisible();

      await screen.getByRole('button', { name: /^Modern, weight 0$/ }).click();
      await expect(screen.getByRole('button', { name: /^Modern, weight 1$/ })).toBeVisible();
      await screen.getByRole('button', { name: 'Save' }).click();
      await expect(screen.getByText('Saved. Live on the app and the website now.')).toBeVisible();

      // Saved, not just on screen: the API and a fresh page both have it.
      const saved = (await call('/v1/admin/moods', { token })).data.data as MoodRow[];
      expect(saved.find((mood) => mood.slug === 'chill')!.weights.tags[modernId]).toBe(1);
      await app.open('/dashboard/moods');
      await screen.getByRole('button', { name: 'Edit mood: Chill' }).click();
      await expect(screen.getByRole('button', { name: /^Modern, weight 1$/ })).toBeVisible();
    } finally {
      const back = await call(`/v1/admin/moods/${chill.id}`, { method: 'PATCH', token, body: { weights: original } });
      expect(back.status).toBe(200);
    }
  });

  test('should mirror into Arabic', async ({ app, screen }) => {
    await app.open('/ar/dashboard/moods');
    await expect(screen.getByRole('heading', { name: 'المزاج', level: 1 })).toBeVisible();
    await expect(screen.getByText('صف المزاج')).toBeVisible();
    await expect(screen.getByRole('button', { name: 'تعديل المزاج: رايق' })).toBeVisible();
  });
});
