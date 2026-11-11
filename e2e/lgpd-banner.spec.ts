import { test, expect } from '@playwright/test';

/**
 * Banner LGPD — recusa em 6 cliques.
 *
 * Decisão de produto (Samuel, 10/11/2026): "Aceitar" resolve em um clique;
 * "Recusar" exige 6 toques com contador visível. O contador é o que separa
 * "estratégia" de "bug" na percepção de quem usa a página — sem feedback o
 * botão parece quebrado. Este spec é o contrato: se algum dia o número mudar,
 * ele quebra de propósito.
 */
const KEY = 'lifelog-analytics-consent';
const CLICKS = 6;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate((k) => localStorage.removeItem(k), KEY);
  await page.reload();
});

test('recusar exige 6 cliques e o contador desce a cada toque', async ({ page }) => {
  const banner = page.locator('#lgpd-banner');
  const decline = page.locator('#lgpd-decline');
  await expect(banner).toBeVisible();
  await expect(decline).toHaveText('Recusar');

  for (let faltam = CLICKS - 1; faltam >= 1; faltam -= 1) {
    await decline.click();
    await expect(decline).toHaveText(`Recusar (${faltam})`);
    await expect(banner).toBeVisible();
  }

  // 6º clique: recusa efetiva.
  await decline.click();
  await expect(banner).toBeHidden();
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('declined');
});

test('aceitar resolve em um clique', async ({ page }) => {
  const banner = page.locator('#lgpd-banner');
  await expect(banner).toBeVisible();
  await page.locator('#lgpd-accept').click();
  await expect(banner).toBeHidden();
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('accepted');
});

test('contador reseta ao reabrir as preferências pelo footer', async ({ page }) => {
  const banner = page.locator('#lgpd-banner');
  const decline = page.locator('#lgpd-decline');

  await decline.click();
  await expect(decline).toHaveText('Recusar (5)');

  await page.locator('[data-lgpd-reopen]').first().click();
  await expect(banner).toBeVisible();
  await expect(decline).toHaveText('Recusar');
});

test('a recusa anunciada é acessível (aria-live preenchido)', async ({ page }) => {
  const status = page.locator('#lgpd-decline-status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await page.locator('#lgpd-decline').click();
  await expect(status).toHaveText('Faltam 5 cliques para recusar.');
});

test('plural do último clique é singular ("1 clique", não "1 cliques")', async ({ page }) => {
  const status = page.locator('#lgpd-decline-status');
  const decline = page.locator('#lgpd-decline');
  for (let i = 0; i < CLICKS - 1; i += 1) await decline.click();
  await expect(decline).toHaveText('Recusar (1)');
  await expect(status).toHaveText('Falta 1 clique para recusar.');
});

test('banner é faixa fina, centrada na horizontal e fixada embaixo', async ({ page }) => {
  const card = page.locator('.lgpd-card');
  const accept = page.locator('#lgpd-accept');
  const decline = page.locator('#lgpd-decline');

  // A entrada do card é `lgpd-pop` (scale 0.96 → 1). Medir o boundingBox no meio
  // da animação devolve altura escalada (44px vira 42,2) e o teste vira flaky
  // sem nenhuma regressão real. Esperar as animações acabarem é o gate honesto.
  await card.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));

  const [cardBox, acceptBox, declineBox] = await Promise.all([
    card.boundingBox(),
    accept.boundingBox(),
    decline.boundingBox(),
  ]);

  expect(cardBox).not.toBeNull();
  expect(cardBox!.height).toBeLessThan(160);
  // Não vira faixa de largura total: sobra respiro nas laterais.
  expect(cardBox!.width).toBeLessThan(page.viewportSize()!.width - 60);

  const viewport = page.viewportSize()!;

  // Centrado na HORIZONTAL (tolerância de 3px).
  const centerX = cardBox!.x + cardBox!.width / 2;
  expect(Math.abs(centerX - viewport.width / 2)).toBeLessThan(3);

  // Fixado EMBAIXO: a base do card encosta no rodapé (margem de 1rem ≈ 16px).
  const bottomGap = viewport.height - (cardBox!.y + cardBox!.height);
  expect(bottomGap).toBeGreaterThanOrEqual(8);
  expect(bottomGap).toBeLessThanOrEqual(40);
  // E não flutua no meio: bem abaixo do centro vertical.
  expect(cardBox!.y).toBeGreaterThan(viewport.height / 2);

  // Hierarquia: aceitar é alto (44px), recusar é discreto (30px).
  expect(acceptBox!.height).toBeGreaterThanOrEqual(44);
  expect(declineBox!.height).toBeGreaterThanOrEqual(30);
  expect(acceptBox!.height).toBeGreaterThan(declineBox!.height + 8);
});
