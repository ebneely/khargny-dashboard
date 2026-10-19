import { randomUUID } from 'node:crypto';
import { expect } from 'e2e';
import { adminCredentials } from './admin-credentials.js';

/** A 320x240 red JPEG: a real photo an owner could upload. */
export const PHOTO = Buffer.from('/9j/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCADwAUADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAUG/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AlgJzTgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/9k=', 'base64');

const api = process.env.E2E_API_URL ?? 'http://localhost:3110';

async function json(path: string, token: string, init: RequestInit = {}) {
  const response = await fetch(`${api}${path}`, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}) },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, data: body.data, body };
}

/**
 * A fresh place owner for one test: place, subscriber, active subscription and portal account,
 * created through the admin API. cleanup() unlinks and deletes the place so nothing public stays.
 */
export async function createOwner(label = randomUUID().slice(0, 8)) {
  const admin = (await json('/v1/auth/login', '', { method: 'POST', body: JSON.stringify({ email: adminCredentials.username, password: adminCredentials.password }) })).data.access_token as string;
  const cities = (await (await fetch(`${api}/v1/cities`)).json()).data;
  const categories = (await (await fetch(`${api}/v1/categories`)).json()).data;
  const place = await json('/v1/admin/places', admin, { method: 'POST', body: JSON.stringify({ name: `مكان ${label}`, nameEn: `Photo place ${label}`, cityId: cities[0].id, categoryId: categories[0].id, status: 'active' }) });
  expect(place.status).toBe(201);
  const phone = `+2011${String(Date.now()).slice(-8)}`;
  const subscriber = await json('/v1/admin/subscribers', admin, { method: 'POST', body: JSON.stringify({ name: `Owner ${label}`, phone, placeIds: [place.data.id] }) });
  expect(subscriber.status).toBe(201);
  const today = new Date().toISOString().slice(0, 10);
  const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  expect((await json(`/v1/admin/subscribers/${subscriber.data.id}/subscriptions`, admin, { method: 'POST', body: JSON.stringify({ placeId: place.data.id, planName: 'e2e', startDate: today, endDate: end }) })).status).toBe(201);
  const password = `Owner-${label}-pass`;
  expect((await json(`/v1/admin/subscribers/${subscriber.data.id}/account`, admin, { method: 'POST', body: JSON.stringify({ phone, password }) })).status).toBe(201);
  const session = (await json('/v1/portal/auth/login', '', { method: 'POST', body: JSON.stringify({ phone, password }) })).data;
  const owner = (session.accessToken ?? session.access_token) as string;
  return {
    admin, owner, phone, password,
    placeId: place.data.id as string,
    subscriberId: subscriber.data.id as string,
    subscriberName: `Owner ${label}`,
    upload: async () => {
      const form = new FormData();
      form.append('file', new Blob([PHOTO], { type: 'image/jpeg' }), 'photo.jpg');
      return json(`/v1/portal/places/${place.data.id}/media/image`, owner, { method: 'POST', body: form });
    },
    ownerPlace: () => json(`/v1/portal/places/${place.data.id}`, owner),
    adminSubscriber: () => json(`/v1/admin/subscribers/${subscriber.data.id}`, admin),
    placeImages: async () => (await json(`/v1/admin/media/place/${place.data.id}`, admin)).data.images as { id: string }[],
    cleanup: async () => {
      await json(`/v1/admin/subscribers/${subscriber.data.id}/places`, admin, { method: 'PUT', body: JSON.stringify({ placeIds: [] }) });
      await json(`/v1/admin/places/${place.data.id}`, admin, { method: 'DELETE' });
    },
  };
}
