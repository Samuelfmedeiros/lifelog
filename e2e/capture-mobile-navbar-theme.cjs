const { chromium } = require('@playwright/test');

// Captura mobile: navbar nova (fonte maior) + transição de tema começando do toque
// Uso: PORT=4324 node e2e/capture-mobile-navbar-theme.cjs (default 4321)
(async () => {
  const PORT = process.env.PORT || '4321';
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
    viewport: { width: 390, height: 780 },
    deviceScaleFactor: 2,
    hasTouch: true,
    reducedMotion: 'no-preference',
    recordVideo: {
      dir: require('path').join(__dirname, 'videos'),
      size: { width: 390, height: 780 },
    },
  });

  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Mostra a navbar em repouso
  await page.waitForTimeout(1000);

  // Tap no botão de tema (dark → light) — origina do dedo
  const themeBtn = page.locator('#rail-theme');
  const box = await themeBtn.boundingBox();
  const tx = box.x + box.width / 2;
  const ty = box.y + box.height / 2;
  console.log(`tap em (${tx}, ${ty})`);
  await page.touchscreen.tap(tx, ty);
  await page.waitForTimeout(1800);

  // Light → Dark
  await page.touchscreen.tap(tx, ty);
  await page.waitForTimeout(1800);

  // Dark → Light mais uma vez
  await page.touchscreen.tap(tx, ty);
  await page.waitForTimeout(1800);

  await context.close();
  await browser.close();
  console.log('Video captured!');
})();
