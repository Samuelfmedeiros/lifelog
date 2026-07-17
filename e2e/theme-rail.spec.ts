import { test, expect } from '@playwright/test';

/* ═══════════════════════════════════════
   Theme Rail (PalettePicker) Tests
   ═══════════════════════════════════════ */

test.describe('Theme Rail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('toggle button exists and opens popover', async ({ page }) => {
    const toggle = page.locator('#rail-toggle');
    await expect(toggle).toBeVisible();

    // Popover comes fechado
    const rail = page.locator('#theme-rail');
    await expect(rail).not.toHaveClass(/open/);

    // Clica no toggle → abre
    await toggle.click();
    await expect(rail).toHaveClass(/open/);
  });

  test('popover closes when clicking outside', async ({ page }) => {
    const rail = page.locator('#theme-rail');
    const toggle = page.locator('#rail-toggle');

    await toggle.click();
    await expect(rail).toHaveClass(/open/);

    // Clica no body (fora do rail) → fecha
    await page.locator('header').click({ position: { x: 0, y: 0 } });
    await expect(rail).not.toHaveClass(/open/);
  });

  test('toggle opens again after closing', async ({ page }) => {
    const rail = page.locator('#theme-rail');
    const toggle = page.locator('#rail-toggle');

    // Abre
    await toggle.click();
    await expect(rail).toHaveClass(/open/);

    // Fecha (toggle de novo)
    await toggle.click();
    await expect(rail).not.toHaveClass(/open/);

    // Abre de novo
    await toggle.click();
    await expect(rail).toHaveClass(/open/);
  });

  test('theme button toggles dark/light', async ({ page }) => {
    const rail = page.locator('#theme-rail');
    await rail.locator('#rail-toggle').click();
    await expect(rail).toHaveClass(/open/);

    const themeBtn = rail.locator('#rail-theme');
    const html = page.locator('html');

    // Tema inicial
    const initial = await html.getAttribute('data-theme');
    const target = initial === 'dark' ? 'light' : 'dark';

    // Clica → alterna (tem 200ms delay do overlay)
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', target, { timeout: 3000 });

    // Clica de novo → volta
    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', initial, { timeout: 3000 });
  });

  test('cor button cycles through palettes', async ({ page }) => {
    const rail = page.locator('#theme-rail');
    await rail.locator('#rail-toggle').click();

    const corBtn = rail.locator('#rail-cor');
    const indicator = page.locator('#rail-indicator');

    // Pega cor inicial
    const initialBg = await indicator.evaluate(el => el.style.background);

    // Clica pra ciclar
    await corBtn.click();
    const afterBg = await indicator.evaluate(el => el.style.background);
    expect(afterBg).not.toBe(initialBg);

    // Clica mais 5x (volta pro initial depois de 6 paletas)
    for (let i = 0; i < 5; i++) {
      await corBtn.click();
    }
    const finalBg = await indicator.evaluate(el => el.style.background);
    expect(finalBg).toBe(initialBg);
  });

  test('lang button toggles PT/EN', async ({ page }) => {
    const rail = page.locator('#theme-rail');
    await rail.locator('#rail-toggle').click();

    const langBtn = rail.locator('#rail-lang');
    const html = page.locator('html');

    // Idioma inicial
    const initial = await html.getAttribute('lang');
    expect(initial).toMatch(/^pt/);

    // Clica → EN
    await langBtn.click();
    await expect(langBtn).toContainText('EN');
    await expect(html).toHaveAttribute('lang', 'en');

    // Clica de novo → PT
    await langBtn.click();
    await expect(langBtn).toContainText('PT');
    await expect(html).toHaveAttribute('lang', /^pt/);
  });

  test('popover content is visible with 3 buttons', async ({ page }) => {
    const rail = page.locator('#theme-rail');
    await rail.locator('#rail-toggle').click();

    // Popover visível com 3 botões
    const popover = rail.locator('#rail-popover');
    await expect(popover).toBeVisible();

    await expect(popover.locator('#rail-cor')).toBeVisible();
    await expect(popover.locator('#rail-theme')).toBeVisible();
    await expect(popover.locator('#rail-lang')).toBeVisible();

    // Texto dos botões (nome + emoji)
    await expect(popover.locator('#rail-cor')).toContainText('Cor');
    await expect(popover.locator('#rail-lang')).toContainText(/PT|EN/);
  });

  test('localStorage persists palette after reload', async ({ page }) => {
    const rail = page.locator('#theme-rail');
    await rail.locator('#rail-toggle').click();

    const corBtn = rail.locator('#rail-cor');
    await corBtn.click(); // muda paleta

    // Salva qual cor está
    const corApos = await page.locator('#rail-indicator').evaluate(el => el.style.background);

    // Recarrega
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verifica que a mesma cor foi restaurada
    const corDepois = await page.locator('#rail-indicator').evaluate(el => el.style.background);
    expect(corDepois).toBe(corApos);

    // localStorage tem a chave
    const saved = await page.evaluate(() => localStorage.getItem('lifelog-palette'));
    expect(saved).toBeTruthy();
  });

  test('localStorage persists theme after reload', async ({ page }) => {
    const rail = page.locator('#theme-rail');
    await rail.locator('#rail-toggle').click();
    const themeBtn = rail.locator('#rail-theme');
    const html = page.locator('html');

    const initial = await html.getAttribute('data-theme');
    const target = initial === 'dark' ? 'light' : 'dark';

    await themeBtn.click(); // alterna tema (200ms delay)
    await expect(html).toHaveAttribute('data-theme', target, { timeout: 3000 });

    const temaApos = await html.getAttribute('data-theme');
    const savedTema = await page.evaluate(() => localStorage.getItem('lifelog-theme'));
    expect(temaApos).toBe(savedTema);

    // Recarrega
    await page.reload();
    await page.waitForLoadState('networkidle');

    const temaDepois = await page.locator('html').getAttribute('data-theme');
    expect(temaDepois).toBe(temaApos);
  });

  test('localStorage persists lang after reload', async ({ page }) => {
    const rail = page.locator('#theme-rail');
    await rail.locator('#rail-toggle').click();
    const langBtn = rail.locator('#rail-lang');

    await langBtn.click(); // alterna idioma
    const langApos = await page.locator('html').getAttribute('lang');

    // Recarrega
    await page.reload();
    await page.waitForLoadState('networkidle');

    const langDepois = await page.locator('html').getAttribute('lang');
    expect(langDepois).toBe(langApos);
  });
});
