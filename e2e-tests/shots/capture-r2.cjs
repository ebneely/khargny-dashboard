// Plain Playwright capture for the publish-gate round 2 screens (LOCAL only).
const { chromium } = require('../../../perf-probe/node_modules/playwright-core');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const b64 = (v) => Buffer.from(v).toString('base64url');
const makeToken = (admin) => {
  const h = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64(JSON.stringify({ sub: admin.id, email: admin.email, role: admin.role, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+7200 }));
  return `${h}.${p}.${crypto.createHmac('sha256', 'x').update(`${h}.${p}`).digest('base64url')}`;
};
const ADMIN = { id: 'bf78363e-f561-44de-b8d5-516b0ed64b05', email: 'voltagaming2001@gmail.com', role: 'super_admin' };
const BASE = 'http://localhost:3111';
const DIR = path.join(__dirname, 'publish-gate-r2');
const audit = (page) => page.evaluate(() => ({
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  rows: document.querySelectorAll('tr[data-place-id]').length,
  chips: [...document.querySelectorAll('[data-slot="publish-missing"] span')].map(n => n.textContent.trim()),
  legend: document.querySelectorAll('[data-slot="publish-legend"] li').length,
  levels: [...document.querySelectorAll('[data-slot="publish-checks"] [data-slot="segmented-control"]')].map(n => n.textContent.replace(/\s+/g,' ').trim()),
  liveCounts: document.querySelectorAll('[data-slot="live-count"]').length,
  liveZero: document.querySelectorAll('[data-slot="live-zero"]').length,
  publishLine: document.querySelector('[data-slot="publish-line"]')?.textContent?.replace(/\s+/g,' ').trim() ?? null,
  dir: document.documentElement.dir,
}));
(async () => {
  fs.mkdirSync(DIR, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Users/youssef.hosny/AppData/Local/ms-playwright/chromium-1255/chrome-win64/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const value = makeToken(ADMIN);
  await context.addCookies([
    { name: 'session_token', value, domain: 'localhost', path: '/' },
    { name: 'token', value, domain: 'localhost', path: '/', httpOnly: false },
  ]);
  const page = await context.newPage();
  const out = {};
  for (const lang of ['en', 'ar']) {
    const prefix = lang === 'ar' ? '/ar' : '';
    const go = async (name, url, wait = 1600) => {
      await page.goto(`${BASE}${prefix}${url}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(wait);
      await page.screenshot({ path: path.join(DIR, `${lang}-${name}.png`), fullPage: true });
      out[`${lang}-${name}`] = await audit(page);
    };
    await go('inbox-complete', '/dashboard/inbox?queue=complete-to-publish');
    await go('inbox-missing-price', '/dashboard/inbox?queue=missing-price');
    await go('health', '/dashboard/algorithm/health');
    await go('cities', '/dashboard/places/library/cities');
    await go('categories', '/dashboard/places/library/categories');
    // a hidden place's edit page
    const href = await page.locator('tr[data-place-id] a').first().getAttribute('href').catch(() => null);
    if (href) await go('place-edit', href.replace(BASE, '').replace(prefix, ''), 1200);
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
