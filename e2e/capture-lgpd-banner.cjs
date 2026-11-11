/**
 * Prova visual do banner LGPD — LifeLog.
 *
 * Mede o comportamento REAL no preview (http://localhost:4321), não descreve:
 *   - desktop 1280x800 e mobile 390x844
 *   - banner inicial (aceitar + recusar visíveis)
 *   - contador descendo a cada clique em "Recusar"
 *   - estado final (banner fechado, choice persistida em localStorage)
 *
 * Uso: node e2e/capture-lgpd-banner.cjs
 * Saída: e2e/shots/lgpd-*.png
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE = process.env.LIFELOG_BASE || 'http://localhost:4321';
const OUT = path.join(__dirname, 'shots');

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    // Caminho resolvido do ambiente: /usr/bin/chromium não existe neste host
    // (medido 10/11/2026). LIFELOG_CHROME permite override sem editar o script.
    executablePath:
      process.env.LIFELOG_CHROME ||
      '/home/samuel/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--headless=new',
      '--disable-gpu',
    ],
  });

  const relatorio = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      locale: 'pt-BR',
    });
    const page = await context.newPage();
    const erros = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text());
    });

    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    // Banner só aparece depois do script de consent rodar.
    await page.waitForSelector('#lgpd-banner:not([hidden])', { timeout: 10000 });
    await page.waitForTimeout(400);

    const banner = page.locator('#lgpd-banner');
    const box = await banner.boundingBox();
    // O card é o que Samuel vê; o wrapper é inset:0 e sempre cobre a tela.
    const cardBox = await page.locator('.lgpd-card').boundingBox();
    await page.screenshot({ path: path.join(OUT, `lgpd-${vp.name}-00-inicial.png`) });

    const decline = page.locator('#lgpd-decline');
    const accept = page.locator('#lgpd-accept');
    const status = page.locator('#lgpd-decline-status');

    const passo = {
      viewport: vp.name,
      banner_box: box ? { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.width), h: Math.round(box.height) } : null,
      card_box: cardBox ? { x: Math.round(cardBox.x), y: Math.round(cardBox.y), w: Math.round(cardBox.width), h: Math.round(cardBox.height) } : null,
      aceitar_visivel: await accept.isVisible(),
      recusar_visivel: await decline.isVisible(),
      rotulo_inicial: (await decline.textContent()).trim(),
      passos: [],
      fechou_apos: null,
      choice_final: null,
      contador_volta_ao_reabrir: null,
      erros,
    };

    // Cada clique em Recusar deve descer o contador. Se o banner fechar antes
    // de 6, o teste revela aqui — é o comportamento que importa.
    for (let i = 1; i <= 8; i++) {
      const visivel = await decline.isVisible().catch(() => false);
      if (!visivel) break;
      const antes = (await decline.textContent()).trim();
      await decline.click();
      await page.waitForTimeout(250);
      const depois = ((await decline.textContent().catch(() => '')) || '').trim();
      const anuncio = ((await status.textContent().catch(() => '')) || '').trim();
      const aindaAberto = await banner.isVisible().catch(() => false);
      passo.passos.push({ clique: i, antes, depois, anuncio: (anuncio || '').trim(), aberto: aindaAberto });
      if (i === 1) {
        await page.screenshot({ path: path.join(OUT, `lgpd-${vp.name}-01-clique1.png`) });
      }
      if (i === 5) {
        await page.screenshot({ path: path.join(OUT, `lgpd-${vp.name}-05-ultimo-clique.png`) });
      }
      if (!aindaAberto) {
        passo.fechou_apos = i;
        break;
      }
    }

    passo.choice_final = await page.evaluate(() => {
      // O store grava string crua ('accepted'/'declined'), não JSON.
      try {
        return localStorage.getItem('lifelog-analytics-consent');
      } catch (e) {
        return 'storage-error: ' + String(e);
      }
    });

    await page.screenshot({ path: path.join(OUT, `lgpd-${vp.name}-06-fechado.png`) });

    // Reabrir pelo footer deve voltar o contador ao rótulo original.
    const reabrir = page.locator('[data-lgpd-reopen]').first();
    if (await reabrir.count() > 0) {
      await reabrir.click();
      await page.waitForSelector('#lgpd-banner:not([hidden])', { timeout: 5000 });
      await page.waitForTimeout(300);
      passo.contador_volta_ao_reabrir = (await page.locator('#lgpd-decline').textContent()).trim();
      await page.screenshot({ path: path.join(OUT, `lgpd-${vp.name}-07-reaberto.png`) });
    }

    relatorio.push(passo);
    await context.close();
  }

  await browser.close();

  const saida = path.join(OUT, 'lgpd-relatorio.json');
  fs.writeFileSync(saida, JSON.stringify(relatorio, null, 2), 'utf8');
  console.log(JSON.stringify(relatorio, null, 2));
  console.log('\nPNGs em ' + OUT);
})().catch((e) => {
  console.error('FALHOU: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
