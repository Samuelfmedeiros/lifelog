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
    recordVideo: {
      dir: require('path').join(__dirname, 'videos'),
      size: { width: 1280, height: 720 },
    },
  });

  const page = await context.newPage();

  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const themeBtn = page.locator('#rail-theme');
  await themeBtn.waitFor({ state: 'visible', timeout: 5000 });

  // Dark → Light transition
  await themeBtn.click();
  await page.waitForTimeout(2000);

  // Light → Dark transition
  await themeBtn.click();
  await page.waitForTimeout(2000);

  // Dark → Light one more time
  await themeBtn.click();
  await page.waitForTimeout(2000);

  await context.close();
  await browser.close();
  console.log('Video captured!');
})();
