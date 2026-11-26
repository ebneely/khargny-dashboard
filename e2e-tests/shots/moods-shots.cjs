/**
 * Moods page screenshots (EN and AR, desktop and phone), plain Playwright against the local
 * dashboard + local backend on the realcopy. Local only: it refuses a non-localhost URL.
 *
 *   node e2e-tests/shots/moods-shots.cjs
 */
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');

const BASE = process.env.DASH_URL || 'http://localhost:3111';
const EMAIL = process.env.DASH_EMAIL || 'mood-proof@khargny.local';
const PASSWORD = process.env.DASH_PASSWORD || 'MoodProof12345!';
const OUT = path.join(__dirname, 'moods');
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) throw new Error(`local only: ${BASE}`);

const CHROME = process.env.CHROME_PATH || path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1255', 'chrome-win64', 'chrome.exe');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: fs.existsSync(CHROME) ? CHROME : undefined, headless: true });
  const report = [];
  for (const [lang, width, height] of [['en', 1440, 900], ['en', 390, 844], ['ar', 1440, 900], ['ar', 390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width === 390, hasTouch: width === 390, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/dashboard', { timeout: 60000 });
    // Sign in in English, then open the Arabic URL: the language is the address only.
    const target = lang === 'ar' ? `${BASE}/ar/dashboard/moods` : `${BASE}/dashboard/moods`;
    await page.goto(target, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const prefix = `${lang}-${width}`;
    await page.screenshot({ path: path.join(OUT, `${prefix}-1-moods.png`), fullPage: true });
    report.push(`${prefix}-1-moods.png`);

    // The editor with the live preview.
    await page.getByRole('button', { name: lang === 'ar' ? 'تعديل المزاج: رايق' : 'Edit mood: Chill' }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(OUT, `${prefix}-2-editor.png`), fullPage: false });
    report.push(`${prefix}-2-editor.png`);

    const metrics = await page.evaluate(() => {
      const overflow = [...document.querySelectorAll('*')].filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible').slice(0, 5).map((el) => el.tagName + '.' + el.className.toString().slice(0, 40));
      return { pageWidth: document.documentElement.scrollWidth, viewport: window.innerWidth, overflow };
    });
    fs.writeFileSync(path.join(OUT, `${prefix}-metrics.json`), JSON.stringify(metrics, null, 2));
    await context.close();
  }
  await browser.close();
  console.log(report.join('\n'));
})().catch((error) => { console.error(error); process.exit(1); });
