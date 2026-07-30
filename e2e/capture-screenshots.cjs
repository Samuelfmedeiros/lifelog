const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--headless=new',
      '--enable-features=ViewTransition',
      '--disable-gpu',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2,
    reducedMotion: 'no-preference',
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('[BROWSER]', msg.type(), msg.text()));

  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Check if VT API is supported
  const vtSupport = await page.evaluate(() => 'startViewTransition' in document);
  console.log('VT API supported:', vtSupport);

  // Screenshot before click (dark theme)
  await page.screenshot({ path: 'e2e/videos/step-00-dark.png' });

  const themeBtn = page.locator('#rail-theme');
  await themeBtn.waitFor({ state: 'visible', timeout: 5000 });

  // Get button position
  const btnBox = await themeBtn.boundingBox();
  console.log('Theme button position:', btnBox);

  // Click to trigger transition (dark→light)
  await themeBtn.click();

  // Screenshot mid-transition (after 80ms — clip-path should be partial)
  await page.waitForTimeout(80);
  await page.screenshot({ path: 'e2e/videos/step-01-mid-transition.png' });

  // Wait for animation to finish
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/videos/step-02-light.png' });

  // Click again (light→dark)
  await themeBtn.click();
  await page.waitForTimeout(80);
  await page.screenshot({ path: 'e2e/videos/step-03-mid-transition.png' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'e2e/videos/step-04-dark.png' });

  // Check console for any VT errors
  console.log('Screenshots captured!');

  await context.close();
  await browser.close();
})();
