#!/usr/bin/env node
/**
 * Screenshots and the DOM audit for the home summary and the Analytics trend
 * (khargny-dashboard#30). Plain Playwright, headless, LOCAL ONLY, one pass per language and
 * viewport. The pictures are opened by eye afterwards; the audit asserts geometry.
 *
 *   node e2e-tests/shots/capture.cjs
 */
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const BASE = process.env.SHOTS_BASE_URL ?? 'http://localhost:3111';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) throw new Error('Local stacks only.');

const CHROME = process.env.CHROME_PATH ?? path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright', 'chromium-1255', 'chrome-win64', 'chrome.exe');
const OUT = path.join(__dirname);
const EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@khargny.local';
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Admin12345!';

const LANGS = [{ key: 'en', prefix: '' }, { key: 'ar', prefix: '/ar' }];
const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 900, isMobile: false },
  { key: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
];
const SCREENS = [
  { name: 'home', path: '/dashboard', ready: '[data-slot=home-measure]', clip: 'section[aria-labelledby=home-at-a-glance]' },
  { name: 'analytics-people', path: '/dashboard/algorithm/people', ready: '[data-slot=engagement-trend]', clip: '[data-slot=engagement-trend]' },
];

/** Eye 2: geometry as assertions. Page rules apply everywhere; control size applies to the new blocks. */
function auditPage() {
  const hits = [];
  const notes = [];
  const viewport = window.innerWidth;
  const phone = viewport <= 640;
  const rect = (element) => element.getBoundingClientRect();
  const visible = (element) => {
    const style = getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return false;
    const box = rect(element);
    return box.width > 0 && box.height > 0;
  };
  if (document.documentElement.scrollWidth > viewport + 1) {
    hits.push({ rule: 'page-scroll', detail: `${document.documentElement.scrollWidth} > ${viewport}` });
  }
  const newRegions = [...document.querySelectorAll('[data-slot=home-measure], [data-slot=engagement-trend]')];
  const inNewRegion = (element) => newRegions.some((region) => region.contains(element));
  const ceiling = phone ? 36 : 34;
  const measure = (element, rule) => {
    if (!visible(element)) return;
    const height = rect(element).height;
    const text = (element.textContent || element.getAttribute('aria-label') || element.tagName).trim().slice(0, 48);
    if (height > ceiling + 0.5) (inNewRegion(element) ? hits : notes).push({ rule, detail: text, height: Math.round(height), ceiling });
  };
  for (const element of document.querySelectorAll('input:not([type=hidden]), select, textarea, button, [role=radio]')) measure(element, 'control-height');
  const tiles = [...document.querySelectorAll('[data-slot=home-measure]')];
  for (const tile of tiles) {
    const box = rect(tile);
    if (box.left < -0.5 || box.right > viewport + 0.5) hits.push({ rule: 'clipping', detail: 'home-measure outside the viewport' });
    if (box.height > 160) hits.push({ rule: 'tile-height', detail: `home-measure ${Math.round(box.height)}px` });
  }
  for (let first = 0; first < tiles.length; first += 1) {
    for (let second = first + 1; second < tiles.length; second += 1) {
      const a = rect(tiles[first]);
      const b = rect(tiles[second]);
      const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) > 0.5
        && Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) > 0.5;
      if (overlap) hits.push({ rule: 'overlap', detail: `home-measure ${first} over ${second}` });
    }
  }
  const trend = document.querySelector('[data-slot=engagement-trend]');
  if (trend) {
    const box = rect(trend);
    if (box.left < -0.5 || box.right > viewport + 0.5) hits.push({ rule: 'clipping', detail: 'engagement-trend outside the viewport' });
    const bar = trend.querySelector('svg');
    if (bar) {
      const svg = rect(bar);
      if (svg.width > box.width + 1) hits.push({ rule: 'overlap', detail: 'trend chart wider than its block' });
    }
    for (const link of trend.querySelectorAll('a')) {
      if (!visible(link)) continue;
      const row = rect(link.closest('li') ?? link);
      if (row.height < 44) notes.push({ rule: 'touch-target', detail: `trend row ${Math.round(row.height)}px`, height: Math.round(row.height), ceiling: 44 });
    }
  }
  for (const element of document.querySelectorAll('section, div, ul, ol')) {
    if (!visible(element)) continue;
    const style = getComputedStyle(element);
    if (!/(auto|scroll)/.test(style.overflowX)) continue;
    if (element.scrollWidth > element.clientWidth + 1) hits.push({ rule: 'horizontal-scroll', detail: (element.getAttribute('data-slot') || element.className.toString().slice(0, 40)) });
  }
  return { viewport, hits, notes, tiles: tiles.length, trend: Boolean(trend) };
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const report = [];
  try {
    for (const viewport of VIEWPORTS) {
      for (const lang of LANGS) {
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, isMobile: viewport.isMobile, hasTouch: viewport.hasTouch, deviceScaleFactor: 1 });
        const page = await context.newPage();
        // A stack that has just booted can answer /login before its API is warm; one retry keeps the run honest.
        for (const attempt of [1, 2]) {
          await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
          await page.getByLabel('Email').fill(EMAIL);
          await page.getByLabel('Password').fill(PASSWORD);
          await page.getByRole('button', { name: 'Sign in' }).click();
          try {
            await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
            break;
          } catch (error) {
            if (attempt === 2) throw error;
            await page.waitForTimeout(5_000);
          }
        }
        const folder = path.join(OUT, `${lang.key}-${viewport.key}`);
        fs.mkdirSync(folder, { recursive: true });
        for (const [index, screen] of SCREENS.entries()) {
          await page.goto(`${BASE}${lang.prefix}${screen.path}`, { waitUntil: 'domcontentloaded' });
          await page.locator(screen.ready).first().waitFor({ timeout: 90_000 });
          await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
          await page.waitForTimeout(700);
          const prefix = String(index + 1).padStart(3, '0');
          await page.screenshot({ path: path.join(folder, `${prefix}_${screen.name}.png`), fullPage: true });
          const clip = page.locator(screen.clip);
          if (await clip.count()) await clip.first().screenshot({ path: path.join(folder, `${prefix}_${screen.name}-detail.png`) }).catch(() => undefined);
          const result = await page.evaluate(auditPage);
          report.push({ screen: screen.name, lang: lang.key, viewport: viewport.key, ...result });
          console.log(`${lang.key}-${viewport.key} ${screen.name}: ${result.hits.length} hit(s), ${result.notes.length} note(s)`);
          for (const hit of result.hits) console.log(`  hit  ${hit.rule}: ${hit.detail}`);
          for (const note of result.notes) console.log(`  note ${note.rule}: ${note.detail}`);
        }
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  const metrics = path.join(OUT, 'metrics.json');
  fs.writeFileSync(metrics, JSON.stringify(report, null, 2));
  const failures = report.reduce((sum, row) => sum + row.hits.length, 0);
  console.log(`\n${report.length} screens scanned, ${failures} hit(s). ${metrics}`);
  process.exitCode = failures ? 1 : 0;
})().catch((error) => { console.error(error); process.exitCode = 1; });
