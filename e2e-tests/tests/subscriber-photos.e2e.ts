import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { createOwner } from './owner-fixture.js';

// Owner photo review in the Inbox (khargny-subs#3, khargny-backend#52): a pending photo shows its
// private image; approve publishes it on the place; reject with a reason, which the owner then sees.
// The per-owner Photos panel (permission switches) was removed from the owner page on 2026-11-25.

describe('owner photos in the inbox', { session: 'admin', tags: ['e2e', 'api'] }, () => {
  test('a pending photo shows, approve publishes it, reject sends the reason to the owner', async ({ app, screen }) => {
    const owner = await createOwner();
    try {
      expect((await owner.upload()).status).toBe(201);
      expect((await owner.upload()).status).toBe(201);
      await app.open('/dashboard/inbox?queue=photos');
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

});
