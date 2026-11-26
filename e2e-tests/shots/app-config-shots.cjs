/**
 * Settings → App screenshots (EN and AR, desktop and phone), plain Playwright against a
 * local dashboard + local backend. Local only: it refuses a non-localhost URL.
 *
 *   NODE_PATH=<a dashboard e2e-tests/node_modules> node e2e-tests/shots/app-config-shots.cjs
 */
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const BASE = process.env.DASH_URL || 'http://localhost:3001';
const EMAIL = process.env.DASH_EMAIL || 'admin@khargny.local';
const PASSWORD = process.env.DASH_PASSWORD || 'Admin12345!';
const OUT = path.join(__dirname, 'app-config');
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) throw new Error(`local only: ${BASE}`);

const CHROME =
  process.env.CHROME_PATH ||
  path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1255', 'chrome-win64', 'chrome.exe');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    headless: true,
  });
  const report = [];
  for (const [lang, width, height] of [
    ['en', 1440, 900],
    ['en', 390, 844],
    ['ar', 1440, 900],
    ['ar', 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: width === 390,
      hasTouch: width === 390,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard', { timeout: 90000 });

    // Sign in in English, then open the Arabic URL: the language is the address only.
    const target = `${lang === 'ar' ? '/ar' : ''}/dashboard/settings/app`;
    await page.goto(`${BASE}${target}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-slot=app-settings-page]', { timeout: 60000 });
    await page.waitForTimeout(800);

    // The top panel and the action bar are fixed on screen. A full-page capture
    // would stamp them over the middle of the page, so put them in the flow first.
    await page.addStyleTag({
      content:
        '[data-slot=top-panel],[data-slot=form-action-bar]{position:static !important;left:auto !important;width:auto !important;}',
    });

    const prefix = `${lang}-${width}`;
    await page.screenshot({ path: path.join(OUT, `${prefix}.png`), fullPage: true });
    report.push(`${prefix}.png`);

    const metrics = await page.evaluate(() => ({
      pageWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      lang: document.documentElement.lang || document.documentElement.dir,
      cards: document.querySelectorAll('[data-slot=app-settings-page] [data-slot=card]').length,
      save: document.querySelector('[data-trace-id=app-settings-save]')?.textContent?.trim() ?? null,
    }));
    fs.writeFileSync(path.join(OUT, `${prefix}-metrics.json`), JSON.stringify(metrics, null, 2));
    await context.close();
  }
  await browser.close();
  console.log(report.join('\n'));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
