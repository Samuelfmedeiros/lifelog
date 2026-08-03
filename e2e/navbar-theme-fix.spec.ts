import { test, expect } from '@playwright/test';

// Contexto touch habilitado pro teste do tap (touchscreen.tap exige hasTouch)
test.use({ hasTouch: true });

// Regressão: navbar SEM scroll nas 3 larguras críticas + fonte fluida maior
// (Samuel rejeitou scroll na navbar explicitamente — preferência de 02/08/2026)
for (const width of [390, 360, 320]) {
  test(`navbar no-scroll @${width}px + fonte nova`, async ({ page }) => {
    await page.setViewportSize({ width, height: 780 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const info = await page.evaluate(() => {
      const rail = document.getElementById('theme-rail');
      const rect = rail?.getBoundingClientRect();
      const centerX = rect ? Math.round(rect.left + rect.width / 2) : -1;
      const centerY = rect ? Math.round(rect.top + rect.height / 2) : -1;
      const fonts = [];
      document.querySelectorAll('.navbar-link').forEach(a => fonts.push(getComputedStyle(a).fontSize));
      return {
        hasScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        railVisible: !!document.elementFromPoint(centerX, centerY)?.closest('#theme-rail'),
        fonts,
      };
    });

    console.log(`[${width}px]`, JSON.stringify(info));
    expect(info.hasScroll).toBe(false);
    expect(info.railVisible).toBe(true);
    // 390px deve ter fonte maior que a antiga (~11.7px)
    if (width === 390) {
      for (const fs of info.fonts) expect(parseFloat(fs)).toBeGreaterThanOrEqual(12.4);
    }
  });
}

// Regressão: animação de tema começa de onde toca no mobile (clipPath inicial
// = coordenadas do tap, não 0,0 — bug do click sintetizado no mobile)
test('animação tema começa de onde toca (mobile tap)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    window.__animClips = [];
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (frames, opts) {
      if (opts && opts.pseudoElement === '::view-transition-new(root)') {
        const fromVal = Array.isArray(frames) ? frames[0]?.clipPath : frames.clipPath?.[0];
        const toVal = Array.isArray(frames) ? frames[1]?.clipPath : frames.clipPath?.[1];
        window.__animClips.push({ from: fromVal || '', to: toVal || '', pseudo: opts.pseudoElement });
      }
      return orig.call(this, frames, opts);
    };
  });

  const btn = page.locator('#rail-theme');
  const box = await btn.boundingBox();
  expect(box).toBeTruthy();
  const tx = Math.round(box.x + box.width / 2);
  const ty = Math.round(box.y + box.height / 2);
  console.log(`tap em (${tx}, ${ty})`);

  await page.touchscreen.tap(tx, ty);
  await page.waitForTimeout(150);

  const clips = await page.evaluate(() => window.__animClips || []);
  console.log('clipPaths capturados:', JSON.stringify(clips));

  expect(clips.length).toBeGreaterThan(0);
  const from = clips[0].from;
  const match = from.match(/circle\(0px at (\d+)px (\d+)px\)/);
  expect(match).toBeTruthy();
  const cx = parseInt(match[1], 10);
  const cy = parseInt(match[2], 10);
  expect(Math.abs(cx - tx)).toBeLessThanOrEqual(8);
  expect(Math.abs(cy - ty)).toBeLessThanOrEqual(8);
});
