import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { adminGet, adminToken, call, cancelBooking, cancelTrip, handCash, newCustomer, newLister, newTrip, pause, SEED_SETTINGS, signInLister } from './tourism-fixture.js';

// Dashboard → Trips marketplace (tourism P2P). Variants covered:
// - lister documents: waiting → verify; waiting → reject with a reason; photos load privately
// - trips: approve one (seed "Sahel beach night"), reject one with a reason, approve several at once,
//   hide and unhide a public trip; verified and free levels in the list
// - cash rewards: a dispute counted as given, owed money for two listers marked paid in one action
// - reward rules: switch off + change the budget, save, then restore the seed values
// - reports: a customer report closed
// - Today inbox and every tab in English and Arabic
// Viewer (read-only) screens are checked by the screenshot script (tourism-shots/dashboard/shoot.mjs).
// The local stack allows 100 requests a minute per IP: each test pauses before it starts.

describe('trips marketplace', { session: 'admin', tags: ['e2e', 'tourism'] }, () => {
  test('documents waiting: verify one lister, reject another with a reason', async ({ app, screen }) => {
    const good = await newLister(`Verify Me ${Date.now() % 1e6}`);
    const bad = await newLister(`Reject Me ${Date.now() % 1e6}`);
    await app.open(`/dashboard/tourism/listers/${good.agencyId}`);
    await expect(screen.getByText('Documents waiting')).toBeVisible();
    for (const photo of ['National ID, front', 'National ID, back', 'Selfie', 'License or commercial registry']) await expect(screen.getByRole('img', photo)).toBeVisible();
    await screen.getByRole('button', 'Verify lister').tap();
    await expect(screen.getByRole('img', 'Verified by 5argny').first()).toBeVisible();
    await expect.poll(async () => (await adminGet(`/agencies/${good.agencyId}`)).kycStatus).toBe('verified');

    await app.open(`/dashboard/tourism/listers/${bad.agencyId}`);
    await screen.getByRole('button', 'Reject documents').tap();
    await screen.getByRole('textbox', 'Reason').fill('The selfie does not match the ID');
    await screen.getByRole('dialog').getByRole('button', 'Confirm').tap();
    await expect(screen.getByText(/Rejected because: The selfie does not match the ID/)).toBeVisible();
    expect((await adminGet(`/agencies/${bad.agencyId}`)).kycRejectionReason).toBe('The selfie does not match the ID');
  });

  test('trips: approve the waiting Sahel night, reject one, approve two at once, hide and unhide', async ({ app, screen }) => {
    await pause(20_000);
    const lister = await signInLister('lister.verified@demo.5argny.local');
    const tag = Date.now() % 1e6;
    const [rejectId, bulkA, bulkB] = [await newTrip(lister, `Reject trip ${tag}`), await newTrip(lister, `Bulk A ${tag}`), await newTrip(lister, `Bulk B ${tag}`)];
    try {
      const sahel = ((await adminGet('/trips?status=pending')) as { id: string; titleEn: string }[]).find((trip) => trip.titleEn === 'Sahel beach night');
      if (sahel) {
        await app.open(`/dashboard/tourism?tab=trips&trip=${sahel.id}`);
        await expect(screen.getByRole('heading', /Sahel beach night/)).toBeVisible();
        await screen.getByRole('dialog').getByRole('button', 'Approve trip').tap();
        await expect.poll(async () => ((await adminGet('/trips?status=live')) as { id: string }[]).some((trip) => trip.id === sahel.id)).toBe(true);
      }

      await app.open(`/dashboard/tourism?tab=trips&trips-status=pending&trip=${rejectId}`);
      await screen.getByRole('dialog').getByRole('button', 'Reject trip').tap();
      await screen.getByRole('textbox', 'Reason').fill('Add the hotel name to the description');
      await screen.getByRole('button', 'Confirm').tap();
      await expect.poll(async () => ((await adminGet('/trips?status=rejected')) as { id: string; rejectionReason: string }[]).find((trip) => trip.id === rejectId)?.rejectionReason).toBe('Add the hotel name to the description');

      await screen.getByRole('checkbox', `Select Bulk A ${tag}`).tap();
      await screen.getByRole('checkbox', `Select Bulk B ${tag}`).tap();
      await screen.getByRole('button', 'Approve 2 trips').tap();
      await expect.poll(async () => ((await adminGet('/trips?status=live')) as { id: string }[]).filter((trip) => [bulkA, bulkB].includes(trip.id)).length).toBe(2);

      await app.open(`/dashboard/tourism?tab=trips&trip=${bulkA}`);
      await screen.getByRole('dialog').getByRole('button', 'Hide trip').tap();
      await screen.getByRole('button', 'Confirm').tap();
      await expect.poll(async () => ((await adminGet('/trips?status=hidden')) as { id: string }[]).some((trip) => trip.id === bulkA)).toBe(true);
      await app.open(`/dashboard/tourism?tab=trips&trip=${bulkA}`);
      await screen.getByRole('dialog').getByRole('button', 'Unhide trip').tap();
      await expect.poll(async () => ((await adminGet('/trips?status=live')) as { id: string }[]).some((trip) => trip.id === bulkA)).toBe(true);
    } finally {
      for (const id of [rejectId, bulkA, bulkB]) await cancelTrip(lister, id);
    }
  });

  test('cash: decide a dispute, then mark two listers as paid in one action', async ({ app, screen }) => {
    await pause(30_000);
    const tag = Date.now() % 1e6;
    const undo: (() => Promise<void>)[] = [];
    try {
      const first = await newLister(`Cash One ${tag}`, { verify: true });
      const second = await newLister(`Cash Two ${tag}`, { verify: true });
      const firstTrip = await newTrip(first.token, `Cash trip one ${tag}`, { approve: true });
      undo.push(() => cancelTrip(first.token, firstTrip));
      const secondTrip = await newTrip(second.token, `Cash trip two ${tag}`, { approve: true });
      undo.push(() => cancelTrip(second.token, secondTrip));
      const disputer = await newCustomer(`Dispute Customer ${tag}`);
      const happy = await newCustomer(`Happy Customer ${tag}`);
      const dispute = await handCash(first.token, firstTrip, disputer, false);
      undo.unshift(() => cancelBooking(disputer, dispute.bookingId));
      const confirmed = await handCash(second.token, secondTrip, happy, true);
      undo.unshift(() => cancelBooking(happy, confirmed.bookingId));
      await pause(15_000);
      await app.open('/dashboard/tourism?tab=cash');
      const row = screen.getByRole('listitem', `Dispute Customer ${tag}`);
      await row.getByRole('button', 'Count as given').tap();
      await screen.getByRole('textbox', /Note for the record/).fill('Lister sent a photo of the receipt');
      await screen.getByRole('button', 'Confirm').tap();
      await expect.poll(async () => ((await adminGet('/redemptions')).items as { id: string; status: string }[]).find((item) => item.id === dispute.rewardId)?.status).toBe('confirmed');

      await screen.getByRole('checkbox', `Select Cash One ${tag}`).tap();
      await screen.getByRole('checkbox', `Select Cash Two ${tag}`).tap();
      await expect(screen.getByText(first.instapay)).toBeVisible();
      await screen.getByRole('button', 'Mark 2 listers as paid').tap();
      await screen.getByRole('button', 'Confirm').tap();
      await expect.poll(async () => (await adminGet(`/agencies/${first.agencyId}`)).redemptions.reimbursedEgp).toBe(250);
      expect((await adminGet(`/agencies/${second.agencyId}`)).redemptions.reimbursedEgp).toBe(250);
      await expect(screen.getByRole('listitem', `Cash One ${tag}`)).not.toBeVisible();
    } finally {
      for (const step of undo) await step();
    }
  });

  test('reward rules: turn off and change the budget, then restore the seed values', async ({ app, screen }) => {
    await pause(30_000);
    try {
      await app.open('/dashboard/tourism?tab=cash');
      await expect(screen.getByText(/250 EGP per reward · budget 25,000 EGP/)).toBeVisible();
      await screen.getByRole('button', 'Change reward rules').tap();
      await screen.getByRole('switch', 'Cash rewards on').tap();
      await screen.getByLabel('Total budget (EGP)').fill('30000');
      await screen.getByRole('button', 'Save reward rules').tap();
      await expect.poll(async () => adminGet('/settings')).toMatchObject({ ...SEED_SETTINGS, rewardsEnabled: false, budgetEgp: 30000 });

      await expect(screen.getByText(/Off: no new rewards · 250 EGP per reward · budget 30,000 EGP/)).toBeVisible();
      await screen.getByRole('button', 'Change reward rules').tap();
      await screen.getByRole('switch', 'Cash rewards on').tap();
      await screen.getByLabel('Total budget (EGP)').fill('25000');
      await screen.getByRole('button', 'Save reward rules').tap();
      await expect.poll(async () => adminGet('/settings')).toMatchObject(SEED_SETTINGS);
    } finally {
      await call('PUT', '/v1/admin/tourism/settings', { token: await adminToken(), body: SEED_SETTINGS });
    }
  });

  test('reports: close a customer report', async ({ app, screen }) => {
    await pause(15_000);
    const tag = Date.now() % 1e6;
    const lister = await newLister(`Free Lister ${tag}`, { kyc: false });
    const trip = await newTrip(lister.token, `Reported trip ${tag}`);
    const customer = await newCustomer(`Reporter ${tag}`);
    try {
      expect((await call('POST', `/v1/tourism/customer/trips/${trip}/report`, { token: customer, body: { reason: `Organizer asked for payment outside 5argny ${tag}` } })).status).toBe(201);
      await app.open('/dashboard/tourism?tab=reports');
      const row = screen.getByRole('listitem', `رحلة Reported trip ${tag}`);
      await expect(row.getByText(`“Organizer asked for payment outside 5argny ${tag}”`)).toBeVisible();
      await expect(row.getByText('Free Lister ' + tag)).toBeVisible();
      await row.getByRole('button', /Close report/).tap();
      await expect(screen.getByRole('listitem', `رحلة Reported trip ${tag}`)).not.toBeVisible();
      expect(((await adminGet('/reports?status=closed')) as { tripId: string }[]).some((report) => report.tripId === trip)).toBe(true);
    } finally {
      await cancelTrip(lister.token, trip);
    }
  });

  test('Today inbox and the tabs read in English and Arabic', async ({ app, screen }) => {
    await pause(15_000);
    await app.open('/dashboard/tourism');
    await expect(screen.getByRole('heading', 'Trips marketplace')).toBeVisible();
    await expect(screen.getByText('Needs you today')).toBeVisible();
    await expect(screen.getByText('Cash reward budget')).toBeVisible();
    await expect(screen.getByRole('link', 'Trips').first()).toBeVisible();
    await screen.getByRole('radio', 'ع').tap();
    try {
      await expect(screen.getByRole('heading', 'سوق الرحلات')).toBeVisible();
      await expect(screen.getByText('محتاج منك النهارده')).toBeVisible();
      await expect(screen.getByText('ميزانية مكافآت الكاش')).toBeVisible();
      await screen.getByRole('tab', 'المنظّمين').tap();
      await expect(screen.getByText(/شركات ومرشدين ومنظّمين بيعرضوا رحلات/)).toBeVisible();
      await screen.getByRole('tab', 'الرحلات').tap();
      await expect(screen.getByText('إعلان مجاني').first()).toBeVisible();
      await screen.getByRole('tab', 'البلاغات').tap();
      await expect(screen.getByText('بلاغات العملاء')).toBeVisible();
    } finally {
      await screen.getByRole('radio', 'EN').tap();
    }
  });
});
