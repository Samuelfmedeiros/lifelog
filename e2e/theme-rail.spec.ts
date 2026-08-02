import { test, expect } from './fixtures';

test.describe('Theme Rail', () => {
  test.beforeEach(async ({ goto }) => {
    await goto('/');
  });

  test('inline controls are visible inside navbar-links', async ({ page }) => {
    const themeBtn = page.getByLabel('Alternar tema');
    const colorBtn = page.getByLabel('Paleta de cores');
    const langBtn = page.getByLabel('Alternar idioma');

    await expect(themeBtn).toBeVisible();
    await expect(colorBtn).toBeVisible();
    await expect(langBtn).toBeVisible();

    // Os controles estão dentro da navbar-links
    const navLinks = page.locator('.navbar-links');
    await expect(navLinks.getByLabel('Alternar tema')).toBeVisible();
    await expect(navLinks.getByLabel('Paleta de cores')).toBeVisible();
    await expect(navLinks.getByLabel('Alternar idioma')).toBeVisible();
  });

  test('color button opens dropdown downward', async ({ page }) => {
    const colorBtn = page.getByLabel('Paleta de cores');
    const dropdown = page.locator('#rail-color-dropdown');

    await expect(dropdown).not.toHaveClass(/open/);
    await colorBtn.click();
    await expect(dropdown).toHaveClass(/open/);

    const dots = dropdown.locator('.rail-dot');
    await expect(dots).toHaveCount(6);

    // Fecha ao clicar fora
    await page.getByRole('heading', { level: 1 }).first().click();
    await expect(dropdown).not.toHaveClass(/open/);
  });

  test('palette selection via dropdown works', async ({ page }) => {
    await page.getByLabel('Paleta de cores').click();
    await page.locator('.rail-dot[data-palette="emerald"]').click();
    await expect(page.locator('#rail-color-dropdown')).not.toHaveClass(/open/);

    await page.getByLabel('Paleta de cores').click();
    await expect(page.locator('.rail-dot[data-palette="emerald"]')).toHaveClass(/active/);
  });

  test('theme button toggles dark/light', async ({ page }) => {
    const html = page.locator('html');
    const themeBtn = page.getByLabel('Alternar tema');
    const initial = await html.getAttribute('data-theme');
    const target = initial === 'dark' ? 'light' : 'dark';

    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', target, { timeout: 3000 });

    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', initial, { timeout: 3000 });
  });

  test('lang button toggles PT/EN', async ({ page }) => {
    const langBtn = page.getByLabel('Alternar idioma');
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
    await page.getByLabel('Paleta de cores').click();
    await page.locator('.rail-dot[data-palette="emerald"]').click();

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByLabel('Paleta de cores').click();
    await expect(page.locator('.rail-dot[data-palette="emerald"]')).toHaveClass(/active/);

    const saved = await page.evaluate(() => localStorage.getItem('lifelog-palette'));
    expect(saved).toBe('emerald');
  });

  test('localStorage persists theme after reload', async ({ page }) => {
    const html = page.locator('html');
    const themeBtn = page.getByLabel('Alternar tema');
    const initial = await html.getAttribute('data-theme');
    const target = initial === 'dark' ? 'light' : 'dark';

    await themeBtn.click();
    await expect(html).toHaveAttribute('data-theme', target, { timeout: 3000 });

    const temaApos = await html.getAttribute('data-theme');

    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(html).toHaveAttribute('data-theme', temaApos);
  });
});
