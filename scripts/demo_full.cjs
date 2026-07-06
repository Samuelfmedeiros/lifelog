const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  const outDir = path.join(__dirname, '..', 'public');

  // ========== 1. HOMEPAGE DARK MODE ==========
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'demo-01-dark-home.png'), fullPage: false });

  // ========== 2. ABRIR THEME RAIL ==========
  const railToggle = page.locator('#rail-toggle');
  await railToggle.click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, 'demo-02-rail-open.png'), fullPage: false });

  // ========== 3. TROCAR PARA TEMA CLARO ==========
  const themeBtn = page.locator('#rail-theme');
  await themeBtn.click();
  await page.waitForTimeout(1200); // Aguardar transição completa
  await page.screenshot({ path: path.join(outDir, 'demo-03-light-mode.png'), fullPage: false });

  // ========== 4. SCROLL PRA VER FUNDO SOLAR ==========
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'demo-04-light-scroll.png'), fullPage: false });

  // ========== 5. VOLTAR AO TOPO E VOLTAR PRA DARK ==========
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(500);

  // Fechar rail primeiro
  await page.locator('#rail-toggle').click();
  await page.waitForTimeout(400);
  // Abrir de novo
  await page.locator('#rail-toggle').click();
  await page.waitForTimeout(400);
  // Voltar pra dark
  await page.locator('#rail-theme').click();
  await page.waitForTimeout(1200);

  await page.screenshot({ path: path.join(outDir, 'demo-05-back-dark.png'), fullPage: false });

  // ========== 6. CLICAR NUM POST ==========
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);

  // Clicar no primeiro card de post
  const firstCard = page.locator('.post-card a').first();
  await firstCard.click();
  await page.waitForURL('**/post/**');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, 'demo-06-post-page.png'), fullPage: false });

  // ========== 7. SCROLL NO POST ==========
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'demo-07-post-scroll.png'), fullPage: false });

  // ========== 8. VOLTAR PRA HOME ==========
  await page.locator('.navbar-logo').first().click();
  await page.waitForURL('http://localhost:4321/');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'demo-08-back-home.png'), fullPage: false });

  console.log('✅ Screenshots salvos em public/demo-*.png');
  await browser.close();
})();
