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

// Regressão pós-fix 12/08/2026 (2ª rodada — Samuel quer o CÍRCULO no mobile):
// - Mobile (≤768px) E Desktop: clip-path circular expansivo, origem = toque.
//   O crossfade opacity do 08a3d2d foi REVERTIDO (Samuel: "Quero a troca de
//   temas no mobile também"). O teste falha se alguém reintroduzir crossfade
//   no mobile (ou remover o clip-path).
test('animação tema: mobile usa clip-path circular (origem = toque)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    window.__animClips = [];
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (frames, opts) {
      const pseudo = opts && opts.pseudoElement;
      if (pseudo === '::view-transition-new(root)' || pseudo === '::view-transition-old(root)') {
        const frame = Array.isArray(frames) ? frames[0] : frames;
        window.__animClips.push({
          from: frame?.clipPath || '',
          opacity: frame?.opacity !== undefined ? String(frame.opacity) : '',
          pseudo,
        });
      }
      return orig.call(this, frames, opts);
    };
  });

  const btn = page.locator('#rail-theme');
  const box = await btn.boundingBox();
  expect(box).toBeTruthy();

  await page.touchscreen.tap(Math.round(box.x + box.width / 2), Math.round(box.y + box.height / 2));
  await page.waitForTimeout(150);

  const clips = await page.evaluate(() => window.__animClips || []);
  console.log('anims mobile capturados:', JSON.stringify(clips));

  expect(clips.length).toBeGreaterThan(0);
  // Circular: o new(root) DEVE ter clip-path circle() partindo do toque
  const newClip = clips.find(c => c.pseudo === '::view-transition-new(root)');
  expect(newClip).toBeTruthy();
  // from pode ser string ("circle(0px at Xpx Ypx)") ou array de keyframes
  const fromVal = Array.isArray(newClip.from) ? newClip.from.join(' ') : String(newClip.from || '');
  expect(fromVal).toContain('circle(');
  // Regressão: NÃO pode ser crossfade opacity (o que Samuel rejeitou)
  expect(clips.every(c => !c.opacity)).toBeTruthy();
});

test('animação tema: desktop mantém clip-path circular da origem do clique', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  await page.evaluate(() => {
    window.__animClips = [];
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (frames, opts) {
      if (opts && opts.pseudoElement === '::view-transition-new(root)') {
        const fromVal = Array.isArray(frames) ? frames[0]?.clipPath : frames.clipPath?.[0];
        window.__animClips.push({ from: fromVal || '' });
      }
      return orig.call(this, frames, opts);
    };
  });

  const btn = page.locator('#rail-theme');
  const box = await btn.boundingBox();
  expect(box).toBeTruthy();
  const tx = Math.round(box.x + box.width / 2);
  const ty = Math.round(box.y + box.height / 2);
  console.log(`click em (${tx}, ${ty})`);

  await page.mouse.click(tx, ty);
  await page.waitForTimeout(150);

  const clips = await page.evaluate(() => window.__animClips || []);
  console.log('clipPaths desktop capturados:', JSON.stringify(clips));

  expect(clips.length).toBeGreaterThan(0);
  const from = clips[0].from;
  const match = from.match(/circle\(0px at (\d+)px (\d+)px\)/);
  expect(match).toBeTruthy();
  const cx = parseInt(match[1], 10);
  const cy = parseInt(match[2], 10);
  expect(Math.abs(cx - tx)).toBeLessThanOrEqual(8);
  expect(Math.abs(cy - ty)).toBeLessThanOrEqual(8);
});
