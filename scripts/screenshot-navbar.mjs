import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:4321';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 200 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  // Dark mode screenshot
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.setItem('lifelog-theme', 'dark'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.video-capture/navbar-dark.png', fullPage: false });

  // Light mode screenshot
  await page.evaluate(() => localStorage.setItem('lifelog-theme', 'light'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.video-capture/navbar-light.png', fullPage: false });

  await browser.close();
  console.log('OK: screenshots saved');
})();
