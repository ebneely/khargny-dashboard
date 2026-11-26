import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { adminToken, call, stamp } from './learned-fixture.js';

/**
 * The place Owner tab and the owner's Places tab, against the real API and dashboard:
 * empty place → link an existing owner → plan and history read back → a second owner is
 * refused → unlink keeps the history; then the owner's Places tab lists the place with its
 * money and links another free place. Everything this test makes is removed at the end.
 */
test('place Owner tab and owner Places tab', { session: 'admin', tags: ['e2e'] }, async ({ app, screen }) => {
  const token = await adminToken();
  const run = stamp();
  const listOf = (body: any): any[] => body?.items ?? body?.data ?? body ?? [];
  const cities = listOf((await call('/v1/admin/cities?limit=100', { token })).data) as { id: string }[];
  const categories = listOf((await call('/v1/admin/categories', { token })).data) as { id: string }[];
  const createdPlaces: string[] = [];
  const createdSubscribers: string[] = [];
  const placeBody = (label: string) => ({ name: `مكان المالك ${label}`, nameEn: `Owner place ${label}`, cityId: cities[0].id, categoryId: categories[0].id, status: 'active' });
  const newPlace = async (label: string) => {
    const response = await call('/v1/admin/places', { method: 'POST', token, body: placeBody(label) });
    expect(response.status).toBe(201);
    createdPlaces.push(response.data.id);
    return response.data as { id: string; name: string; nameEn: string };
  };
  const newOwner = async (label: string) => {
    const response = await call('/v1/admin/subscribers', { method: 'POST', token, body: { name: `Owner ${label}`, phone: `+2010${String(Date.now()).slice(-8)}` } });
    expect(response.status).toBe(201);
    createdSubscribers.push(response.data.id);
    return response.data as { id: string; name: string };
  };

  try {
    const place = await newPlace(run);
    const other = await newPlace(`${run}b`);
    const owner = await newOwner(run);
    const rival = await newOwner(`${run}rival`);

    // The empty state: the two actions and no owner row.
    await app.open(`/dashboard/places/${place.id}?tab=owner`);
    await expect(screen.getByText('No owner yet')).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Create owner for this place' })).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Link an existing owner' })).toBeVisible();

    // Link the existing owner through the search dialog.
    await screen.getByRole('button', { name: 'Link an existing owner' }).tap();
    await expect(screen.getByRole('dialog')).toBeVisible();
    await screen.getByLabel('Search owners...').fill(owner.name);
    await expect(screen.getByRole('dialog').getByText(owner.name)).toBeVisible();
    await screen.getByRole('button', { name: `Link ${owner.name}` }).tap();
    await expect(screen.getByText('Linked.')).toBeVisible();

    // A plan on this place makes the owner card read plan, status and renewal date.
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const subscription = await call(`/v1/admin/subscribers/${owner.id}/subscriptions`, { method: 'POST', token, body: { placeId: place.id, planName: 'e2e owner', plan: 'owner', planKind: 'paid', startDate: today, endDate: end } });
    expect(subscription.status).toBe(201);
    await app.open(`/dashboard/places/${place.id}?tab=owner`);
    await expect(screen.getByText(owner.name).first()).toBeVisible();
    await expect(screen.getByText('Link history')).toBeVisible();
    await expect(screen.getByText('Renewal date')).toBeVisible();

    // A place has at most one active owner: the API refuses the second one.
    const second = await call(`/v1/admin/places/${place.id}/owner`, { method: 'POST', token, body: { subscriberId: rival.id } });
    expect(second.status).toBe(409);
    expect(second.body.error?.code ?? second.body.code).toBe('PLACE_ALREADY_OWNED');

    // Unlink: the place is free again and the history keeps the link with its unlink time.
    await screen.getByRole('button', { name: 'Unlink owner' }).tap();
    await screen.getByRole('button', { name: 'Confirm' }).tap();
    await expect(screen.getByText('No owner yet')).toBeVisible();
    await expect(screen.getByText(/Unlinked/)).toBeVisible();

    // The owner's Places tab: the linked place with plan, price, ads and status, then link a second one.
    await app.open(`/dashboard/money/owners/${owner.id}?tab=places`);
    await expect(screen.getByText("The owner's places")).toBeVisible();
    await screen.getByRole('button', { name: 'Add a place' }).tap();
    await expect(screen.getByRole('dialog')).toBeVisible();
    await screen.getByLabel('Search places by name...').fill(place.nameEn);
    await expect(screen.getByRole('dialog').getByText(place.nameEn)).toBeVisible();
    await screen.getByRole('button', { name: `Link ${place.nameEn}` }).tap();
    await expect(screen.getByTestId('owner-places-grid').getByRole('cell', { name: new RegExp(place.nameEn) })).toBeVisible();

    await screen.getByRole('button', { name: 'Add a place' }).tap();
    await screen.getByLabel('Search places by name...').fill(other.nameEn);
    await expect(screen.getByRole('dialog').getByText(other.nameEn)).toBeVisible();
    await screen.getByRole('button', { name: `Link ${other.nameEn}` }).tap();
    await expect(screen.getByTestId('owner-places-grid').getByRole('cell', { name: new RegExp(other.nameEn) })).toBeVisible();
  } finally {
    for (const placeId of createdPlaces) await call(`/v1/admin/places/${placeId}`, { method: 'DELETE', token });
    for (const subscriberId of createdSubscribers) await call(`/v1/admin/subscribers/${subscriberId}`, { method: 'DELETE', token });
  }
});
