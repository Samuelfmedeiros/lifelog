import { test, expect } from './fixtures';

test.describe('Theme Rail', () => {
  test.beforeEach(async ({ goto }) => {
    await goto('/');
  });

  test('inline controls are visible inside navbar-links', async ({ page }) => {
    const themeBtn = page.getByLabel('Alternar tema');
    const colorBtn = page.getByLabel('Paleta de cores');
    const langLink = page.locator('.navbar-lang');

    await expect(themeBtn).toBeVisible();
    await expect(colorBtn).toBeVisible();
    await expect(langLink).toBeVisible();

    // Os controles estão dentro da navbar-links
    const navLinks = page.locator('.navbar-links');
    await expect(navLinks.getByLabel('Alternar tema')).toBeVisible();
    await expect(navLinks.getByLabel('Paleta de cores')).toBeVisible();
    await expect(navLinks.locator('.navbar-lang')).toBeVisible();
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

  test('lang link points to the other locale', async ({ page }) => {
    const langLink = page.locator('.navbar-lang');
    await expect(langLink).toHaveAttribute('href', '/en/');
    await expect(langLink).toHaveText('EN');

    // Versão EN aponta de volta pra PT
    await page.goto('/en/');
    const enLang = page.locator('.navbar-lang');
    await expect(enLang).toHaveAttribute('href', '/');
    await expect(enLang).toHaveText('PT');
  });

  test('navbar order: CTA Portfólio primeiro, depois links, rail e lang', async ({ page }) => {
    // .navbar-links > * incluiria o <script> inline que o PalettePicker injeta
    // como filho direto — :not(script) mantém os índices 0-5 abaixo
    const links = page.locator('.navbar-links > :not(script)');
    const count = await links.count();

    // Ordem dentro de navbar-links (navbar sem logo — 15/08/2026):
    // [0] 🚀 Portfólio CTA (primeiro),
    // [1] Início, [2] Arquivo, [3] Sobre,
    // [4] #theme-rail (controls), [5] lang
    expect(count).toBeGreaterThanOrEqual(6);

    const cta = links.nth(0);
    await expect(cta).toHaveClass(/cta/);
    await expect(cta).toHaveAttribute('href', 'https://samuelmedeiros.vercel.app');

    await expect(links.nth(1)).toHaveAttribute('href', '/');
    await expect(links.nth(2)).toHaveAttribute('href', '/arquivo');
    await expect(links.nth(3)).toHaveAttribute('href', '/sobre');
    await expect(links.nth(4)).toHaveId('theme-rail');
    await expect(links.nth(5)).toHaveClass(/navbar-lang/);
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