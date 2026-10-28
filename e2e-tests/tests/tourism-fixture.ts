import { expect } from 'e2e';
import { adminCredentials } from './admin-credentials.js';

// Trips marketplace test data, made through the real API (khargny-backend API.md "Tourism P2P").
// Every lister, trip, customer and booking gets a unique suffix; cleanup() cancels the trips and
// bookings through the app's own paths (the API has no delete for listers or customers).
const api = process.env.E2E_API_URL ?? 'http://localhost:3110';
const stamp = () => `${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 90 + 10)}`;
const future = (days: number) => new Date(Date.now() + days * 864e5).toISOString();

type Call = { status: number; data: any; body: any };
export async function call(method: string, path: string, { token, body, form }: { token?: string; body?: unknown; form?: FormData } = {}): Promise<Call> {
  const headers: Record<string, string> = { Origin: 'http://localhost:3121' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(api + path, { method, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const parsed = await response.json().catch(() => ({}));
  return { status: response.status, data: parsed?.data ?? parsed, body: parsed };
}

let admin: string | null = null;
export async function adminToken() {
  admin ??= (await call('POST', '/v1/auth/login', { body: { email: adminCredentials.username, password: adminCredentials.password } })).data.access_token as string;
  return admin;
}
export const adminGet = async (path: string) => (await call('GET', `/v1/admin/tourism${path}`, { token: await adminToken() })).data;

let photo: Blob | null = null;
async function image() {
  if (photo) return photo;
  const trips = (await call('GET', '/v1/tourism/trips')).data as { coverUrl: string | null }[];
  const cover = trips.find((trip) => trip.coverUrl)!.coverUrl!;
  photo = new Blob([await (await fetch(api + cover)).arrayBuffer()], { type: 'image/webp' });
  return photo;
}

async function account(kind: 'agency' | 'customer', name: string) {
  const id = stamp();
  const r = await call('POST', '/v1/tourism/auth/sign-up/email', { body: { email: `e2e-dash-${kind}-${id}@test.5argny.local`, password: 'Passw0rd!x', name, kind, phone: `012${id.slice(-8)}` } });
  expect(r.status).toBe(200);
  return { token: r.body.token as string, id };
}

/** A new lister; with kyc it has sent ID, selfie, license and InstaPay and waits for review. */
export async function newLister(name: string, { kyc = true, verify = false } = {}) {
  const { token, id } = await account('agency', name);
  const reg = await call('POST', '/v1/tourism/agency/register', { token, body: { kind: 'agency', name, city: 'Cairo', acceptTerms: true } });
  expect(reg.status).toBe(201);
  if (kyc) {
    const form = new FormData();
    for (const [key, value] of Object.entries({ ownerName: `Owner ${name}`, licenseNumber: `LIC-${id}`, nationalId: `2990101${id.slice(-7)}`, instapay: `e2e${id}@instapay` })) form.append(key, value);
    for (const field of ['idFront', 'idBack', 'selfie', 'license']) form.append(field, await image(), `${field}.webp`);
    expect((await call('POST', '/v1/tourism/agency/kyc', { token, form })).status).toBe(201);
  }
  if (verify) expect((await call('POST', `/v1/admin/tourism/agencies/${reg.data.id}/verify`, { token: await adminToken() })).status).toBe(200);
  return { token, agencyId: reg.data.id as string, instapay: `e2e${id}@instapay` };
}

export async function signInLister(email: string) {
  const r = await call('POST', '/v1/tourism/auth/sign-in/email', { body: { email, password: 'Passw0rd!x' } });
  return r.body.token as string;
}

export async function newTrip(listerToken: string, titleEn: string, { approve = false } = {}) {
  const r = await call('POST', '/v1/tourism/agency/trips', { token: listerToken, body: { kind: 'trip', title: `رحلة ${titleEn}`, titleEn, destination: 'Fayoum', departureCity: 'Cairo', description: 'Lake Qarun and Wadi El Rayan waterfalls.', includes: 'Bus\nLunch', startsAt: future(30), endsAt: future(31), priceEgp: 1200, seatsTotal: 10 } });
  expect(r.status).toBe(201);
  if (approve) expect((await call('POST', `/v1/admin/tourism/trips/${r.data.id}/approve`, { token: await adminToken(), body: {} })).status).toBe(200);
  return r.data.id as string;
}

/** A customer with a finished profile. */
export async function newCustomer(name: string) {
  const { token, id } = await account('customer', name);
  expect((await call('POST', '/v1/tourism/customer/profile', { token, body: { nationalId: `2980202${id.slice(-7)}`, acceptTerms: true } })).status).toBe(201);
  return token;
}

/** Customer books a verified trip, the lister scans the QR and hands the cash, the customer answers. */
export async function handCash(listerToken: string, tripId: string, customer: string, received: boolean) {
  const booking = await call('POST', '/v1/tourism/customer/bookings', { token: customer, body: { tripId, seats: 1 } });
  expect(booking.data.reward?.amountEgp).toBe(250);
  const qr = (await call('GET', '/v1/tourism/customer/qr', { token: customer })).data.token;
  const scan = (await call('POST', '/v1/tourism/agency/scan', { token: listerToken, body: { token: qr } })).data;
  const option = scan.options[0];
  expect((await call('POST', '/v1/tourism/agency/redemptions', { token: listerToken, body: { scanId: scan.scanId, bookingId: option.booking.id, rewardId: option.reward.id } })).data.status).toBe('cash_given');
  expect((await call('POST', `/v1/tourism/customer/rewards/${option.reward.id}/answer`, { token: customer, body: { received } })).data.status).toBe(received ? 'confirmed' : 'disputed');
  return { bookingId: booking.data.booking.id as string, rewardId: option.reward.id as string };
}

export async function cancelTrip(listerToken: string, tripId: string) {
  await call('POST', `/v1/tourism/agency/trips/${tripId}/cancel`, { token: listerToken });
}
export async function cancelBooking(customer: string, bookingId: string) {
  await call('POST', `/v1/tourism/customer/bookings/${bookingId}/cancel`, { token: customer });
}

/** The seed's reward rules (seed-demo.mjs); every test that touches them restores these. */
export const SEED_SETTINGS = { rewardsEnabled: true, rewardAmountEgp: 250, budgetEgp: 25000, earlyBirdPerTrip: 10, inviteCap: 5, weeklyCapPerAgency: 20 };

export const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
