#!/usr/bin/env node
/**
 * Screenshots for the nearby work (owner rule: plain Playwright, not the agent).
 * Usage: node shots/capture.cjs [en|ar] [desktop|phone]
 * Local only: it points at the e2e stack on localhost and refuses anything else.
 *
 * It also measures the new controls (heights, overflow, row alignment) and writes
 * metrics-<lang>-<view>.json beside the pictures.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');

const BASE = process.env.E2E_DASHBOARD_URL ?? 'http://localhost:3111';
const lang = process.argv[2] === 'ar' ? 'ar' : 'en';
const view = process.argv[3] === 'phone' ? 'phone' : 'desktop';
const OUT = path.join(__dirname, `${lang}-${view}`);

if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`refusing a non-local dashboard: ${BASE}`);
  process.exit(1);
}

function chromiumPath() {
  const root = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
  const builds = fs
    .readdirSync(root)
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
  for (const build of builds) {
    const exe = path.join(root, build, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(exe)) return exe;
  }
  throw new Error('no chromium build in ms-playwright');
}

const url = (route) => `${BASE}${lang === 'ar' ? '/ar' : ''}${route}`;
const labels =
  lang === 'ar'
    ? {
        settings: 'الإعدادات',
        sheet: 'إعدادات الخوارزمية',
        feed: 'القريب: الفيد',
        ads: 'القريب: الإعلانات',
      }
    : {
        settings: 'Settings',
        sheet: 'Algorithm settings',
        feed: 'Nearby: the feed',
        ads: 'Nearby: the ads',
      };

/** Control and layout measurements for the screens this change adds. */
async function measure(page) {
  return page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) };
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const fields = [...document.querySelectorAll('input, select, textarea')].filter(visible).map((el) => ({
      kind: el.tagName.toLowerCase(),
      name: el.getAttribute('aria-label') || el.id || '',
      ...rect(el),
    }));
    const buttons = [...document.querySelectorAll('button')].filter(visible).map((el) => ({
      name: (el.textContent || '').trim().slice(0, 40),
      ...rect(el),
    }));
    const rows = [...document.querySelectorAll('ul > li')].filter(visible).map((el) => rect(el));
    return {
      pageScrollsX: document.documentElement.scrollWidth > window.innerWidth + 1,
      pageWidth: window.innerWidth,
      fields,
      buttons,
      tallestRow: rows.reduce((max, r) => Math.max(max, r.height), 0),
      overflowing: [...document.querySelectorAll('*')]
        .filter(visible)
        .filter((el) => el.scrollWidth > el.clientWidth + 1 && ['auto', 'scroll'].includes(getComputedStyle(el).overflowX))
        .map((el) => el.className.toString().slice(0, 60)),
    };
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: chromiumPath(), headless: true, windowsHide: true });
  const context = await browser.newContext(
    view === 'phone'
      ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  );
  const page = await context.newPage();
  const metrics = {};

  await page.goto(url('/login'), { waitUntil: 'domcontentloaded' });
  await page.fill('#email', 'admin@khargny.local');
  await page.fill('#password', 'Admin12345!');
  await page.click('button[type=submit]');
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });

  // 1. The Algorithm page, then the settings sheet on each Nearby group.
  await page.goto(url('/dashboard/algorithm/today'), { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(OUT, '01_algorithm_today.png'), fullPage: true });
  await page.getByRole('button', { name: labels.settings }).click();
  await page.getByRole('heading', { name: labels.sheet }).waitFor();
  await page.getByRole('radio', { name: labels.feed }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '02_settings_nearby_feed.png'), fullPage: true });
  metrics.settingsFeed = await measure(page);
  await page.getByRole('radio', { name: labels.ads }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '03_settings_nearby_ads.png'), fullPage: true });
  metrics.settingsAds = await measure(page);
  await page.getByRole('button', { name: lang === 'ar' ? 'إغلاق' : 'Close' }).click();

  // 2. Places → Location check.
  await page.goto(url('/dashboard/places/location-check'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, '04_location_check.png'), fullPage: true });
  metrics.locationCheck = await measure(page);

  // 3. The campaign form's where-and-to-whom step, where the reach lives.
  const placeId = process.env.NEARBY_PLACE_ID ?? (await page.getAttribute('ul[aria-label] li a[href*="/dashboard/places/"]', 'href').catch(() => null))?.split('/').pop();
  await page.goto(url('/dashboard/money/ads/new'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, '05_campaign_step1_place.png'), fullPage: true });
  if (placeId) {
    await page.goto(url(`/dashboard/money/ads/new?placeId=${placeId}`), { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, '06_campaign_reach.png'), fullPage: true });
    metrics.campaignReach = await measure(page);
  }

  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));
  console.log(`[shots] ${lang}/${view} → ${OUT}`);
  await browser.close();
})().catch((error) => {
  console.error('[shots] failed:', error.message);
  process.exit(1);
});
