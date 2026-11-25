/* Local-only screenshots for Place > SEO. Usage: node shots/capture-seo.cjs */
const { chromium } = require('playwright-core');
const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const BASE = 'http://localhost:3111';
const OUT = join(__dirname);
const CHROME = join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1255', 'chrome-win64', 'chrome.exe');

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill('admin@khargny.local');
  await page.getByLabel('Password').fill('Admin12345!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
}

async function capture(lang, viewport, label) {
  const dir = join(OUT, `${lang}-${label}`);
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({
    viewport: label === 'phone' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: label === 'phone',
    hasTouch: label === 'phone',
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await login(page);
  const prefix = lang === 'ar' ? '/ar' : '';
  await page.goto(`${BASE}${prefix}/dashboard/places`, { waitUntil: 'domcontentloaded' });
  const placeLink = lang === 'ar'
    ? page.getByRole('link', { name: /أهرامات الجيزة/ }).first()
    : page.getByRole('link', { name: /Giza Pyramids/ }).first();
  await placeLink.click();
  await page.waitForURL(/\/dashboard\/places\/[0-9a-f-]+/, { timeout: 30000 });
  const placeUrl = page.url().replace(/\/ar\//, '/').replace('/dashboard/places/', '');
  const id = placeUrl.split('?')[0];
  await page.getByRole('tab', { name: lang === 'ar' ? 'تحسين الظهور' : 'SEO' }).click();
  await page.getByText(lang === 'ar' ? 'درجة الظهور' : 'SEO score', { exact: true }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(dir, '001_place_seo.png'), fullPage: true });
  const audit = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    };
    const controls = [...document.querySelectorAll('button, input, select, [role="tab"], a')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          name: (element.getAttribute('aria-label') || element.textContent || '').trim().slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      });
    return {
      viewport: { width: innerWidth, height: innerHeight },
      pageWidth: document.documentElement.scrollWidth,
      horizontalScroll: document.documentElement.scrollWidth > innerWidth + 1,
      controls,
      overHeight: controls.filter((control) => control.height > 44),
    };
  });
  writeFileSync(join(dir, 'metrics.json'), JSON.stringify(audit, null, 2));
  await page.goto(`${BASE}${prefix}/dashboard/places/seo`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: lang === 'ar' ? 'تحسين الظهور' : 'SEO' }).waitFor({ timeout: 30000 });
  await page.getByRole('table').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes('— places'), null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(dir, '002_places_seo.png'), fullPage: true });
  console.log(`${lang}-${label}: place ${id}`);
  await browser.close();
}

(async () => {
  for (const lang of ['en', 'ar']) {
    for (const [label, viewport] of [['desktop', 1440], ['phone', 390]]) {
      await capture(lang, viewport, label);
    }
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
