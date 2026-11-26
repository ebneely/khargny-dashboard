#!/usr/bin/env node
/**
 * Screenshots and the DOM audit for the place Owner tab, the owner Places tab, the Hype
 * rank pill and the toolbar row. Plain Playwright, headless, LOCAL ONLY.
 *
 *   node e2e-tests/shots/capture-owner.cjs
 *
 * LOCAL e2e stack only: dashboard :3111, API :3110. Every record this script makes is
 * removed at the end.
 */
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const BASE = process.env.SHOTS_BASE_URL ?? 'http://localhost:3111';
const API = process.env.SHOTS_API_URL ?? 'http://localhost:3110';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE) || !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(API)) throw new Error('Local stacks only.');

const CHROME = process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1255', 'chrome-win64', 'chrome.exe');
const OUT = __dirname;
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@khargny.local';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin12345!';
const LANGS = [{ key: 'en', prefix: '' }, { key: 'ar', prefix: '/ar' }];
const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 900, isMobile: false },
  { key: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
];

async function api(pathname, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API}${pathname}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${pathname} → ${response.status} ${parsed?.error?.code ?? ''}`);
  return parsed.data ?? parsed;
}

const today = () => new Date().toISOString().slice(0, 10);
const endDate = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

async function seed() {
  const login = await api('/v1/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
  const token = login.access_token;
  const cityRows = await api('/v1/admin/cities?limit=100', { token });
  const cities = cityRows.items ?? cityRows.data ?? cityRows;
  const categoryRows = await api('/v1/admin/categories', { token });
  const categories = categoryRows.items ?? categoryRows.data ?? categoryRows;
  const stamp = Date.now().toString(36);
  const place = async (label) => api('/v1/admin/places', { method: 'POST', token, body: { name: `مكان المالك ${stamp}${label}`, nameEn: `Owner shot place ${stamp}${label}`, cityId: cities[0].id, categoryId: categories[0].id, status: 'active' } });
  const emptyPlace = await place('empty');
  const linkedPlace = await place('linked');
  const secondPlace = await place('second');
  const owner = await api('/v1/admin/subscribers', { method: 'POST', token, body: { name: `Owner shot ${stamp}`, phone: `+2011${String(Date.now()).slice(-8)}` } });
  await api(`/v1/admin/places/${linkedPlace.id}/owner`, { method: 'POST', token, body: { subscriberId: owner.id } });
  await api(`/v1/admin/subscribers/${owner.id}/subscriptions`, { method: 'POST', token, body: { placeId: linkedPlace.id, planName: 'owner shot', plan: 'owner', planKind: 'paid', startDate: today(), endDate: endDate() } });
  // Real 30-day views so the places list has hype ranks and the pill has text to show.
  // The hype is read from place_stats_hourly, so the local e2e database gets the same rows
  // the hourly collector writes. Local stack only.
  const seeded = await api('/v1/admin/places?limit=50', { token });
  const rows = seeded.items ?? seeded.data ?? seeded;
  const counts = [240, 160, 90, 40, 12];
  const backendDir = process.env.OWNER_BACKEND_DIR ?? path.resolve(__dirname, '../../..', 'owner-backend');
  const { Client } = require(path.join(backendDir, 'node_modules', 'pg'));
  const database = new Client({ connectionString: process.env.SHOTS_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:55434/khargny_e2e' });
  await database.connect();
  for (let index = 0; index < Math.min(counts.length, rows.length); index += 1) {
    await database.query("INSERT INTO place_stats_hourly (place_id, hour, views) VALUES ($1, date_trunc('hour', now()), $2) ON CONFLICT (place_id, hour) DO UPDATE SET views = GREATEST(place_stats_hourly.views, EXCLUDED.views)", [rows[index].id, counts[index]]);
  }
  await database.end();
  return {
    token,
    placeIds: [emptyPlace.id, linkedPlace.id, secondPlace.id],
    subscriberId: owner.id,
    emptyId: emptyPlace.id,
    linkedId: linkedPlace.id,
    secondId: secondPlace.id,
    emptyName: emptyPlace.nameEn,
    ownerName: owner.name,
  };
}

async function cleanup(data) {
  for (const placeId of data.placeIds) await api(`/v1/admin/places/${placeId}`, { method: 'DELETE', token: data.token }).catch(() => {});
  await api(`/v1/admin/subscribers/${data.subscriberId}`, { method: 'DELETE', token: data.token }).catch(() => {});
}

async function audit(page) {
  return page.evaluate(() => {
    const hits = [];
    const metrics = {};
    const viewport = window.innerWidth;
    const phone = viewport <= 640;
    if (document.documentElement.scrollWidth > viewport + 1) hits.push({ rule: 'page-scroll', detail: `${document.documentElement.scrollWidth} > ${viewport}` });
    const pills = [...document.querySelectorAll('[data-slot=hype-rank-pill]')];
    metrics.pills = pills.length;
    for (const pill of pills) {
      if (pill.scrollWidth > pill.clientWidth + 1) hits.push({ rule: 'pill-wrapped', detail: pill.textContent });
      if (pill.scrollHeight > pill.clientHeight + 1) hits.push({ rule: 'pill-two-lines', detail: pill.textContent });
      const box = pill.getBoundingClientRect();
      if (box.height > 22.5) hits.push({ rule: 'pill-height', detail: `${pill.textContent}: ${Math.round(box.height)}px` });
      if (box.width > 340) hits.push({ rule: 'pill-stretched', detail: `${pill.textContent}: ${Math.round(box.width)}px` });
    }
    const rows = [...document.querySelectorAll('[data-slot=toolbar-row]')];
    metrics.toolbarRows = rows.length;
    for (const row of rows) {
      if (row.querySelector('[data-slot=toolbar-caption]')) hits.push({ rule: 'caption-inside-row' });
      const controls = [...row.querySelectorAll('button, [role=radio], [data-slot=segmented-control]')].filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      });
      const allTops = controls.map((element) => Math.round(element.getBoundingClientRect().top));
      const firstLine = Math.min(...allTops);
      const tops = allTops.filter((top) => top - firstLine <= 4);
      if (tops.length > 1 && Math.max(...tops) - Math.min(...tops) > 2) hits.push({ rule: 'toolbar-baseline', detail: tops.join(',') });
      const heights = controls.map((element) => Math.round(element.getBoundingClientRect().height));
      metrics.controlHeights = [...(metrics.controlHeights ?? []), ...heights];
    }
    const ceiling = phone ? 36 : 34;
    for (const button of document.querySelectorAll('[data-slot=owner-card] button, [data-slot=owner-empty] button, [data-slot=owner-places-tab] button')) {
      const height = button.getBoundingClientRect().height;
      if (height > ceiling + 4) hits.push({ rule: 'owner-button-height', detail: `${(button.textContent || '').trim()}: ${Math.round(height)}px` });
    }
    return { viewport, hits, metrics };
  });
}

(async () => {
  const data = await seed();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const report = [];
  try {
    for (const viewport of VIEWPORTS) {
      for (const lang of LANGS) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch, deviceScaleFactor: 1 });
        const page = await context.newPage();
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
          await page.getByLabel('Email').fill(EMAIL);
          await page.getByLabel('Password').fill(PASSWORD);
          await page.getByRole('button', { name: 'Sign in' }).click();
          try { await page.waitForURL(/\/dashboard/, { timeout: 45_000 }); break; }
          catch (error) { if (attempt === 2) throw error; await page.waitForTimeout(5_000); }
        }
        const folder = path.join(OUT, `${lang.key}-${viewport.key}`);
        fs.mkdirSync(folder, { recursive: true });
        const go = (pathname) => `${BASE}${lang.prefix}/dashboard${pathname}`;
        const shot = async (name, pathname, ready, clip) => {
          await page.goto(go(pathname), { waitUntil: 'domcontentloaded' });
          if (ready) await page.waitForSelector(ready, { timeout: 60_000 });
          await page.waitForTimeout(800);
          const file = path.join(folder, `${name}.png`);
          if (clip) await page.locator(clip).first().screenshot({ path: file });
          else await page.screenshot({ path: file, fullPage: true });
          const result = await audit(page);
          report.push({ lang: lang.key, viewport: viewport.key, screen: name, ...result });
        };
        await shot('01_owner-empty', `/places/${data.emptyId}?tab=owner`, '[data-slot=owner-empty]');
        await shot('02_owner-linked', `/places/${data.linkedId}?tab=owner`, '[data-slot=owner-card]');
        await shot('03_owner-places', `/money/owners/${data.subscriberId}?tab=places`, '[data-slot=owner-places-tab] tbody tr');
        await shot('04_places-hype', '/places?sort=hype', 'table tbody tr');
        await shot('04b_hype-pill', '/places?sort=hype', '[data-slot=hype-rank-pill]', '[data-slot=hype-rank-pill]');
        await shot('05_analytics-toolbar', '/places?sort=hype', '[data-slot=toolbar]', '[data-slot=toolbar]');
        await shot('06_algorithm-toolbar', '/algorithm/today', '[data-slot=toolbar]', '[data-slot=toolbar]');
        await context.close();
      }
    }
  } finally {
    await browser.close();
    await cleanup(data);
  }
  fs.writeFileSync(path.join(OUT, 'owner-metrics.json'), JSON.stringify(report, null, 2));
  for (const entry of report) {
    const hits = entry.hits.length;
    console.log(`${entry.lang}-${entry.viewport} ${entry.screen}: ${hits ? `FAIL ${hits}` : 'ok'} (pills ${entry.metrics.pills}, toolbar rows ${entry.metrics.toolbarRows})`);
    for (const hit of entry.hits) console.log(`  - ${hit.rule} ${hit.detail ?? ''}`);
  }
})().catch((error) => { console.error(error); process.exit(1); });
