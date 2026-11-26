import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { adminToken, call } from './learned-fixture.js';

// Nearby (owner rule, 2026-11-25): the two Nearby groups on the Algorithm page, and Places →
// Location check. The location lists are made real through the API — Cairo gets a centre and three
// seeded places get pins that are wrong in the three ways the check reports — then put back.

type Place = { id: string; slug: string; name: string; nameEn: string | null; cityId: string };
type City = { id: string; slug: string; name: string; nameEn: string | null };

const listOf = (body: any): any[] => body?.items ?? body?.data ?? [];

async function findPlace(token: string, slug: string): Promise<Place> {
  const response = await call(`/v1/admin/places?search=${slug}&limit=50`, { token });
  const place = listOf(response.data).find((row) => row.slug === slug);
  if (!place) throw new Error(`seeded place ${slug} not found`);
  return place as Place;
}

async function findCity(token: string, slug: string): Promise<City> {
  const response = await call('/v1/admin/cities?limit=100', { token });
  const city = listOf(response.data).find((row) => row.slug === slug);
  if (!city) throw new Error(`seeded city ${slug} not found`);
  return city as City;
}

const setCentre = (token: string, cityId: string, lat: number, lng: number) =>
  call(`/v1/admin/cities/${cityId}`, { method: 'PATCH', token, body: { lat, lng } });

const setPin = (token: string, placeId: string, lat: number, lng: number) =>
  call(`/v1/admin/places/${placeId}`, { method: 'PATCH', token, body: { lat, lng } });

/**
 * The three wrong pins the check exists for, made through the real API: Cairo gets a centre;
 * Giza Pyramids goes ~105 km from it; the museum shares that exact pin; Abou Tarek is filed in
 * Cairo but pinned in Athens. Idempotent, so each test that reads the lists calls it.
 */
async function arrangePins(token: string) {
  const cairo = await findCity(token, 'cairo');
  const giza = await findPlace(token, 'giza-pyramids');
  const museum = await findPlace(token, 'egyptian-museum');
  const abouTarek = await findPlace(token, 'abou-tarek');
  const arranged = [await setCentre(token, cairo.id, 30.0444, 31.2357), await setPin(token, giza.id, 30.9, 31.7), await setPin(token, museum.id, 30.9, 31.7), await setPin(token, abouTarek.id, 41.0, 29.0)];
  expect(arranged.map((row) => row.status)).toEqual([200, 200, 200, 200]);
  return { giza, museum, abouTarek };
}

describe('nearby: the settings and the location check', { session: 'admin', tags: ['e2e'], serial: true }, () => {
  test('the Nearby groups read every nearby number and the save flow validates', async ({ app, screen }) => {
    await app.open('/dashboard/algorithm/today');
    await screen.getByRole('button', { name: 'Settings' }).tap();

    // The feed group: four numbers and the sentence that says what the curve does.
    await screen.getByRole('radio', { name: 'Nearby: the feed' }).tap();
    await expect(screen.getByText('A place 3 km away counts half as near as one next door.', { exact: false })).toBeVisible();
    for (const label of ['Feed: nearness weight', 'Feed: half distance (km)', 'Feed: max distance (km)', 'Feed: lowest nearness']) {
      await expect(screen.getByLabel(label)).toBeVisible();
    }
    // The ads group: three numbers, and the reach that decides which ads a person may see.
    await screen.getByRole('radio', { name: 'Nearby: the ads' }).tap();
    await expect(screen.getByText('A place 5 km away counts half as near as one next door', { exact: false })).toBeVisible();
    for (const label of ['Ads: nearness weight', 'Ads: half distance (km)', 'Ads: max distance (km)']) {
      await expect(screen.getByLabel(label)).toBeVisible();
    }

    // A half distance of 0 is refused by the server and the panel says so.
    await screen.getByRole('radio', { name: 'Nearby: the feed' }).tap();
    const half = screen.getByLabel('Feed: half distance (km)');
    await half.fill('0');
    await screen.getByRole('button', { name: 'Save settings' }).tap();
    await expect(screen.getByRole('alert')).toContainText('Could not save the settings.');

    // A real save: 3 km stays, the weight becomes 2, and the panel reads back what was saved.
    await half.fill('3');
    const weight = screen.getByLabel('Feed: nearness weight');
    await weight.fill('2');
    await screen.getByRole('button', { name: 'Save settings' }).tap();
    await expect(screen.getByLabel('Feed: nearness weight')).toHaveValue('2');

    // Put it back, so the run leaves the start value behind.
    await screen.getByLabel('Feed: nearness weight').fill('1');
    await screen.getByRole('button', { name: 'Save settings' }).tap();
    await expect(screen.getByLabel('Feed: nearness weight')).toHaveValue('1');
  });

  test('Location check lists the far pins, the shared pin and the pin outside Egypt', async ({ app, screen, browser }) => {
    const token = await adminToken();
    const pins = await arrangePins(token);

    await app.open('/dashboard/places/location-check');

    await expect(screen.getByRole('heading', 'Location check')).toBeVisible();
    await expect(screen.getByText('more than 40 km from the city centre', { exact: false })).toBeVisible();
    // The legend names the three icons.
    await expect(screen.getByText('Far from the centre', { exact: true })).toBeVisible();
    await expect(screen.getByText('Shared point', { exact: true })).toBeVisible();
    await expect(screen.getByText('Outside the country', { exact: true })).toBeVisible();

    // A pin 105 km from the centre is listed with its distance, city and coordinates.
    const far = screen.getByRole('list', { name: 'Far from the centre' });
    const farRow = far.getByRole('link', { name: 'Giza Pyramids' });
    await expect(farRow).toBeVisible();
    await expect(far.getByText(/^\d+(\.\d)? km$/).first()).toBeVisible();
    await expect(far.getByText('Cairo', { exact: true }).first()).toBeVisible();

    // The museum shares that exact pin, so both places sit under the shared point.
    await expect(screen.getByRole('list', { name: 'Shared point' }).getByRole('link', { name: 'Egyptian Museum' })).toBeVisible();
    await expect(screen.getByRole('list', { name: 'Shared point' }).getByRole('link', { name: 'Giza Pyramids' })).toBeVisible();
    // Abou Tarek is the one pin outside Egypt.
    await expect(screen.getByRole('list', { name: 'Outside the country' }).getByRole('link', { name: 'Abou Tarek' })).toBeVisible();

    // A row opens the place, where the pin is corrected.
    await farRow.tap();
    await expect(browser).toHaveURL(`/dashboard/places/${pins.giza.id}`);
  });

  test('in Arabic the Nearby groups and the location check read in Arabic', async ({ app, screen }) => {
    // the lists need the pins again: the English test no longer puts them back
    const pins = await arrangePins(await adminToken());
    try {
      await app.open('/ar/dashboard/algorithm/today');
      await screen.getByRole('button', { name: 'الإعدادات' }).tap();
      await screen.getByRole('radio', { name: 'القريب: الفيد' }).tap();
      await expect(screen.getByLabel('الفيد: نصف المسافة (كم)')).toBeVisible();
      await expect(screen.getByText('3 كم بيتحسب نص قربه', { exact: false })).toBeVisible();
      await screen.getByRole('radio', { name: 'القريب: الإعلانات' }).tap();
      await expect(screen.getByLabel('الإعلانات: أقصى مسافة (كم)')).toBeVisible();

      await app.open('/ar/dashboard/places/location-check');
      await expect(screen.getByRole('heading', { name: 'فحص المواقع' })).toBeVisible();
      await expect(screen.getByText('بعيد عن المركز', { exact: true })).toBeVisible();
      await expect(screen.getByText('نقطة مشتركة', { exact: true })).toBeVisible();
      await expect(screen.getByText('بره البلد', { exact: true })).toBeVisible();
      // the three lists are named in Arabic too, so a screen reader reads them
      for (const list of ['بعيد عن المركز', 'نقطة مشتركة', 'بره البلد']) {
        await expect(screen.getByRole('list', { name: list }).first()).toBeAttached();
      }
    } finally {
      await setPin(await adminToken(), pins.giza.id, 30.0444, 31.2357);
      await setPin(await adminToken(), pins.museum.id, 30.05, 31.24);
      await setPin(await adminToken(), pins.abouTarek.id, 30.06, 31.25);
    }
  });
});
