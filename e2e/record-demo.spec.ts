import { test, chromium } from '@playwright/test';

// Use local dev server ou fallback pra produção
const URL = process.env.E2E_BASE_URL || 'http://localhost:4321';

test('record full demo video', async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: '/tmp/', size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  test.setTimeout(90_000);

  // 1. Homepage
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 15_000 });
  await page.waitForTimeout(2000);
  
  // Scroll suave
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(500);

  // 2. Alternar tema
  const themeBtn = page.locator('#rail-theme');
  await themeBtn.waitFor({ state: 'visible', timeout: 5000 });
  await themeBtn.click();
  await page.waitForTimeout(1500);
  await themeBtn.click();
  await page.waitForTimeout(1500);

  // 3. Abrir palette de cores
  const colorBtn = page.locator('#rail-color');
  await colorBtn.click();
  await page.waitForTimeout(800);

  // Pega o primeiro dot disponível (evita depender de synthwave)
  const firstDot = page.locator('.rail-dot').first();
  if (await firstDot.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstDot.click();
    await page.waitForTimeout(1000);
  }

  // Fecha dropdown
  await page.locator('#rail-theme').click();
  await page.waitForTimeout(500);

  // 4. Homepage de novo (após interagir)
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 10_000 });
  await page.waitForTimeout(1000);

  // 5. Filtrar por Arachne
  const arachnePill = page.locator('[data-filter-project="arachne"]');
  if (await arachnePill.isVisible({ timeout: 3000 }).catch(() => false)) {
    await arachnePill.click();
    await page.waitForTimeout(1000);
  }
  // Reset all
  const allPill = page.locator('[data-filter-project="all"]');
  if (await allPill.isVisible({ timeout: 2000 }).catch(() => false)) {
    await allPill.click();
    await page.waitForTimeout(500);
  }

  // 6. Archive
  await page.goto(URL + '/arquivo/', { waitUntil: 'domcontentloaded', timeout: 10_000 });
  await page.waitForTimeout(1500);

  // 7. Clicar no primeiro post
  const firstPost = page.locator('a[href^="/post/"]').first();
  if (await firstPost.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstPost.click();
    await page.waitForTimeout(2000);
  }
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // 8. Sobre
  await page.goto(URL + '/sobre/', { waitUntil: 'domcontentloaded', timeout: 10_000 });
  await page.waitForTimeout(1500);

  // 9. English
  await page.goto(URL + '/en/', { waitUntil: 'domcontentloaded', timeout: 10_000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  await browser.close();
  console.log('✅ Demo video recorded');
});
