const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ========== DESKTOP 1280x800 ==========
  const dctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'pt-BR',
    recordVideo: { dir: '/tmp/demo-desktop', size: { width: 1280, height: 800 } }
  });
  const d = await dctx.newPage();
  await d.goto('http://127.0.0.1:4399/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await d.waitForTimeout(5000); // carga inicial
  await d.screenshot({ path: '/tmp/demo-desktop/01-inicial.png' });

  // hover CTA Portfólio (darken via color-mix)
  await d.locator('.navbar-link.cta').hover();
  await d.waitForTimeout(3500);
  await d.screenshot({ path: '/tmp/demo-desktop/02-cta-hover.png' });

  // hover nos links ghost
  for (const name of ['Início', 'Arquivo', 'Sobre']) {
    const link = d.locator(`.navbar-links a.navbar-link:not(.cta):has-text("${name}")`).first();
    if (await link.count()) { await link.hover(); await d.waitForTimeout(2200); }
  }
  await d.screenshot({ path: '/tmp/demo-desktop/03-links-hover.png' });

  // focus ring por teclado (Tab)
  await d.keyboard.press('Tab');
  await d.waitForTimeout(1800);
  await d.keyboard.press('Tab');
  await d.waitForTimeout(1800);
  await d.keyboard.press('Tab');
  await d.waitForTimeout(1800);
  await d.screenshot({ path: '/tmp/demo-desktop/04-focus-ring.png' });

  // troca paleta -> Ciano
  await d.locator('[aria-label="Paleta de cores"]').click();
  await d.waitForTimeout(1800);
  await d.locator('[aria-label="Paleta Ciano"]').click({ force: true });
  await d.waitForTimeout(4000);
  await d.screenshot({ path: '/tmp/demo-desktop/05-ciano.png' });

  // troca paleta -> Âmbar
  await d.locator('[aria-label="Paleta de cores"]').click();
  await d.waitForTimeout(1800);
  await d.locator('[aria-label="Paleta Âmbar"]').click({ force: true });
  await d.waitForTimeout(4000);
  await d.screenshot({ path: '/tmp/demo-desktop/06-amber.png' });

  // toggle tema light
  await d.locator('[aria-label="Alternar tema"]').click();
  await d.waitForTimeout(4500);
  await d.screenshot({ path: '/tmp/demo-desktop/07-light.png' });

  // volta dark
  await d.locator('[aria-label="Alternar tema"]').click();
  await d.waitForTimeout(4500);
  await d.screenshot({ path: '/tmp/demo-desktop/08-dark.png' });

  // redimensionamento -> mobile (navbar não quebra)
  await d.setViewportSize({ width: 390, height: 844 });
  await d.waitForTimeout(4000);
  await d.screenshot({ path: '/tmp/demo-desktop/09-resize-mobile.png' });

  await dctx.close();

  // ========== MOBILE 390x844 ==========
  const mctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'pt-BR',
    isMobile: true,
    hasTouch: true,
    recordVideo: { dir: '/tmp/demo-mobile', size: { width: 390, height: 844 } }
  });
  const m = await mctx.newPage();
  await m.goto('http://127.0.0.1:4399/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await m.waitForTimeout(5000);
  await m.screenshot({ path: '/tmp/demo-mobile/01-inicial.png' });

  // dropdown paleta no mobile
  await m.locator('[aria-label="Paleta de cores"]').click();
  await m.waitForTimeout(2200);
  await m.screenshot({ path: '/tmp/demo-mobile/02-dropdown.png' });
  await m.locator('[aria-label="Paleta Verde"]').click({ force: true });
  await m.waitForTimeout(4000);
  await m.screenshot({ path: '/tmp/demo-mobile/03-verde.png' });

  // toggle tema no mobile
  await m.locator('[aria-label="Alternar tema"]').click();
  await m.waitForTimeout(4500);
  await m.screenshot({ path: '/tmp/demo-mobile/04-light.png' });

  await mctx.close();

  await browser.close();
  console.log('DEMO DONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
