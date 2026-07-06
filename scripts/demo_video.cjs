const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const outDir = path.join(__dirname, '..', 'public');
  const videoPath = path.join(outDir, 'demo-lifelog-full.webm');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: outDir,
      size: { width: 1280, height: 800 },
    },
  });

  const page = await context.newPage();

  // ========== 1. HOMEPAGE DARK MODE ==========
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // ========== 2. ABRIR THEME RAIL ==========
  await page.locator('#rail-toggle').click();
  await page.waitForTimeout(800);

  // ========== 3. TROCAR PARA TEMA CLARO ==========
  const themeBtn = page.locator('#rail-theme');
  await themeBtn.click();
  await page.waitForTimeout(1500); // Transição completa

  // ========== 4. ESPERAR PARTÍCULAS DOURADAS APARECEREM ==========
  await page.waitForTimeout(1000);

  // ========== 5. SCROLL PRA VER FUNDO SOLAR ==========
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // ========== 6. VOLTAR AO TOPO ==========
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // ========== 7. FECHAR RAIL E REABRIR ==========
  await page.locator('#rail-toggle').click();
  await page.waitForTimeout(600);
  await page.locator('#rail-toggle').click();
  await page.waitForTimeout(600);

  // ========== 8. VOLTAR PRA DARK MODE ==========
  await themeBtn.click();
  await page.waitForTimeout(1500);

  // ========== 9. CLICAR NUM POST ==========
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(500);

  // Clicar no link do primeiro card
  const firstCardLink = page.locator('.post-card a').first();
  await firstCardLink.click();
  await page.waitForURL('**/post/**');
  await page.waitForTimeout(2000);

  // ========== 10. SCROLL NO POST ==========
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // ========== 11. VOLTAR PRA HOME ==========
  await page.locator('.navbar-logo').first().click();
  await page.waitForURL('http://localhost:4321/');
  await page.waitForTimeout(1500);

  // ========== 12. ABRIR RAIL + TEMA CLARO DE NOVO (final) ==========
  await page.locator('#rail-toggle').click();
  await page.waitForTimeout(600);
  await themeBtn.click();
  await page.waitForTimeout(2000);

  await context.close();
  await browser.close();

  // Renomear o video
  const fs = require('fs');
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const src = path.join(outDir, files[0]);
    if (src !== videoPath) {
      fs.renameSync(src, videoPath);
    }
    console.log('✅ Video salvo em:', videoPath);
    console.log('   Tamanho:', (fs.statSync(videoPath).size / 1024 / 1024).toFixed(1), 'MB');
  } else {
    console.log('⚠️ Video não encontrado');
  }
})();
