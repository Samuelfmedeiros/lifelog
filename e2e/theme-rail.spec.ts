import { test, expect } from '@playwright/test';

test.describe('Theme Rail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('inline controls are visible inside navbar-links', async ({ page }) => {
    await expect(page.locator('#rail-theme')).toBeVisible();
    await expect(page.locator('#rail-color')).toBeVisible();
    await expect(page.locator('#rail-lang')).toBeVisible();

    // Os controles estão dentro da navbar-links
    const navLinks = page.locator('.navbar-links');
    await expect(navLinks.locator('#rail-theme')).toBeVisible();
    await expect(navLinks.locator('#rail-color')).toBeVisible();
    await expect(navLinks.locator('#rail-lang')).toBeVisible();
  });

  test('color button opens dropdown downward', async ({ page }) => {
    const colorBtn = page.locator('#rail-color');
    const dropdown = page.locator('#rail-color-dropdown');

    await expect(dropdown).not.toHaveClass(/open/);
    await colorBtn.click();
    await expect(dropdown).toHaveClass(/open/);

    const dots = dropdown.locator('.rail-dot');
    await expect(dots).toHaveCount(6);

    // Fecha ao clicar fora
    await page.locator('h1').first().click();
    await expect(dropdown).not.toHaveClass(/open/);
  });

  test('palette selection via dropdown works', async ({ page }) => {
    await page.locator('#rail-color').click();
    await page.locator('.rail-dot[data-palette="emerald"]').click();
    await expect(page.locator('#rail-color-dropdown')).not.toHaveClass(/open/);

    await page.locator('#rail-color').click();
    await expect(page.locator('.rail-dot[data-palette="emerald"]')).toHaveClass(/active/);
  });

  test('theme button toggles dark/light', async ({ page }) => {
    const html = page.locator('html');
    const initial = await html.getAttribute('data-theme');
    const target = initial === 'dark' ? 'light' : 'dark';

    await page.locator('#rail-theme').click();
    await expect(html).toHaveAttribute('data-theme', target, { timeout: 3000 });

    await page.locator('#rail-theme').click();
    await expect(html).toHaveAttribute('data-theme', initial, { timeout: 3000 });
  });

  test('lang button toggles PT/EN', async ({ page }) => {
    const langBtn = page.locator('#rail-lang');
    const html = page.locator('html');

    await expect(html).toHaveAttribute('lang', /^pt/);

    await langBtn.click();
    await expect(langBtn).toContainText('EN');
    await expect(html).toHaveAttribute('lang', 'en');

    await langBtn.click();
    await expect(langBtn).toContainText('PT');
    await expect(html).toHaveAttribute('lang', /^pt/);
  });

  test('controls are after CTA in navbar-links', async ({ page }) => {
    const links = page.locator('.navbar-links > *');
    const count = await links.count();

    // Ordem dentro de navbar-links:
    // [0] Início, [1] Arquivo, [2] Sobre,
    // [3] 🚀 Portfólio CTA,
    // [4] #theme-rail (controls)
    const sobre = links.nth(2);
    const cta = links.nth(3);
    const rail = links.nth(4);

    await expect(sobre).toHaveAttribute('href', '/sobre');
    await expect(cta).toHaveClass(/cta/);
    await expect(rail).toHaveId('theme-rail');
  });

  test('localStorage persists palette after reload', async ({ page }) => {
    await page.locator('#rail-color').click();
    await page.locator('.rail-dot[data-palette="emerald"]').click();

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.locator('#rail-color').click();
    await expect(page.locator('.rail-dot[data-palette="emerald"]')).toHaveClass(/active/);

    const saved = await page.evaluate(() => localStorage.getItem('lifelog-palette'));
    expect(saved).toBe('emerald');
  });

  test('localStorage persists theme after reload', async ({ page }) => {
    const html = page.locator('html');
    const initial = await html.getAttribute('data-theme');
    const target = initial === 'dark' ? 'light' : 'dark';

    await page.locator('#rail-theme').click();
    await expect(html).toHaveAttribute('data-theme', target, { timeout: 3000 });

    const temaApos = await html.getAttribute('data-theme');

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(html).toHaveAttribute('data-theme', temaApos);
  });
});
