const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless=new', '--enable-features=ViewTransition'],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:4444/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Tema inicial
  const theme0 = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('Tema inicial:', theme0);

  const btn = page.locator('#rail-theme');
  await btn.waitFor({ state: 'visible' });
  const box = await btn.boundingBox();
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);

  // Dispara VT
  await page.evaluate(() => {
    window.__frameData = [];
    const t0 = performance.now();
    const origStart = document.startViewTransition;
    document.startViewTransition = function(cb) {
      window.__vtTs = performance.now();
      return origStart.call(this, cb);
    };
  });
  await page.mouse.click(cx, cy);

  // Captura frames durante ~900ms
  for (let i = 0; i < 10; i++) {
    await page.screenshot({ path: `/tmp/vt2-frame-${i}.png` });
    const ts = await page.evaluate(() => {
      const d = document.documentElement.getAttribute('data-theme');
      const vt = document.__vtTs ? (performance.now() - document.__vtTs).toFixed(0) : '-';
      return { theme: d, vtElapsed: vt, animating: window.__animating };
    });
    console.log(`frame ${i}:`, JSON.stringify(ts));
    await page.waitForTimeout(90);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/vt2-frame-final.png' });
  const final = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute('data-theme'),
  }));
  console.log('final:', JSON.stringify(final));

  await context.close();
  await browser.close();
})();