import { test, chromium } from '@playwright/test';

const URL = 'https://lifelog-sepia.vercel.app';

test('record full demo video', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: '/tmp/', size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // 1. Homepage
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Scroll slowly
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // 2. Toggle theme (dark)
  const themeBtn = page.locator('#rail-theme');
  if (await themeBtn.isVisible()) {
    await themeBtn.click();
    await page.waitForTimeout(2500);
  }

  // 3. Open color palette
  const colorBtn = page.locator('#rail-color');
  if (await colorBtn.isVisible()) {
    await colorBtn.click();
    await page.waitForTimeout(1200);
    
    // Pick synthwave
    const sw = page.locator('.rail-dot[data-palette="synthwave"]');
    if (await sw.isVisible()) {
      await sw.click();
      await page.waitForTimeout(2000);
    }
  }

  // 4. Back to light
  if (await themeBtn.isVisible()) {
    await themeBtn.click();
    await page.waitForTimeout(2000);
  }

  // 5. Filter by Arachne
  const arachnePill = page.locator('[data-filter-project="arachne"]');
  if (await arachnePill.isVisible()) {
    await arachnePill.click();
    await page.waitForTimeout(2000);
  }
  // Reset
  const allPill = page.locator('[data-filter-project="all"]');
  if (await allPill.isVisible()) {
    await allPill.click();
    await page.waitForTimeout(800);
  }

  // 6. Archive
  await page.goto(URL + '/arquivo/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 7. Click first post
  const firstPost = page.locator('a[href^="/post/"]').first();
  if (await firstPost.isVisible()) {
    await firstPost.click();
    await page.waitForTimeout(3000);
  }
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // 8. About
  await page.goto(URL + '/sobre/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 9. English
  await page.goto(URL + '/en/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(1500);

  await browser.close();
  console.log('Demo video recorded');
});
