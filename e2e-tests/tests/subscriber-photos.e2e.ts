import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { createOwner } from './owner-fixture.js';

// Admin photo controls for a subscriber (khargny-subs#3, khargny-backend#52). Variants:
// - permissions: defaults shown (upload on, delete off); each switch saves and the API reflects it
// - review list: empty state; a pending photo shows its private image; approve publishes it on
//   the place; reject with a reason, which the owner then sees
// - language: English and Arabic labels

describe('subscriber photos', { session: 'admin', tags: ['e2e', 'api'] }, () => {
  test('the permission switches show the defaults and save each change', async ({ app, screen }) => {
    const owner = await createOwner();
    try {
      await app.open(`/dashboard/subscribers/${owner.subscriberId}?tab=account`);
      const upload = screen.getByRole('switch', 'Can upload and edit photos');
      const remove = screen.getByRole('switch', 'Can delete photos');
      await expect(upload).toBeChecked();
      await expect(remove).not.toBeChecked();
      await expect(screen.getByText('No photos are waiting.')).toBeVisible();

      await remove.tap();
      await expect(remove).toBeChecked();
      await expect.poll(async () => (await owner.adminSubscriber()).data.canDeletePhotos).toBe(true);
      await upload.tap();
      await expect(upload).not.toBeChecked();
      await expect.poll(async () => (await owner.adminSubscriber()).data.canUploadPhotos).toBe(false);
    } finally {
      await owner.cleanup();
    }
  });

  test('a pending photo shows, approve publishes it, reject sends the reason to the owner', async ({ app, screen }) => {
    const owner = await createOwner();
    try {
      expect((await owner.upload()).status).toBe(201);
      expect((await owner.upload()).status).toBe(201);
      await app.open(`/dashboard/subscribers/${owner.subscriberId}?tab=account`);
      const queue = screen.getByRole('region', /Photos waiting for review/);
      await expect(queue.getByRole('img', /Photo for/).first()).toBeVisible();
      await expect(queue.getByRole('listitem')).toHaveCount(2);

      await queue.getByRole('button', 'Approve').first().tap();
      await expect(queue.getByRole('listitem')).toHaveCount(1);
      await expect.poll(async () => (await owner.placeImages()).length).toBe(1);

      await queue.getByRole('button', 'Reject').first().tap();
      await screen.getByRole('textbox', 'Reason').fill('Please send a brighter photo');
      await screen.getByRole('dialog').getByRole('button', /Reject|Confirm|Save/).last().tap();
      await expect(screen.getByText('No photos are waiting.')).toBeVisible();
      const read = await owner.ownerPlace();
      const rejected = (read.data.photoSubmissions as { status: string; rejectionReason: string }[]).find((row) => row.status === 'rejected');
      expect(rejected?.rejectionReason).toBe('Please send a brighter photo');
    } finally {
      await owner.cleanup();
    }
  });

  test('in Arabic the photo controls read in Arabic', async ({ app, screen }) => {
    const owner = await createOwner();
    try {
      await app.open(`/dashboard/subscribers/${owner.subscriberId}?tab=account`);
      await screen.getByRole('radio', 'ع').tap();
      try {
        await expect(screen.getByRole('switch', 'يمكنه رفع الصور وتعديلها')).toBeChecked();
        await expect(screen.getByRole('switch', 'يمكنه حذف الصور')).not.toBeChecked();
        await expect(screen.getByText('لا توجد صور منتظرة.')).toBeVisible();
      } finally {
        await screen.getByRole('radio', 'EN').tap();
      }
    } finally {
      await owner.cleanup();
    }
  });
});
