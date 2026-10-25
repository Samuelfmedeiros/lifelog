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

  test('navbar order: CTAs (portfólio, loja) primeiro, depois links, rail e lang', async ({ page }) => {
    // .navbar-links > * incluiria o <script> inline que o PalettePicker injeta
    // como filho direto — :not(script) mantém os índices abaixo
    const links = page.locator('.navbar-links > :not(script)');
    const count = await links.count();

    // Ordem dentro de navbar-links (navbar sem logo — 15/08/2026).
    // 24/10/2026: a loja entrou como segundo CTA (o LifeLog levava 423 páginas para a
    // loja e a navbar não tinha NENHUM link para ela), então os índices andaram um:
    // [0] CTA Portfólio, [1] CTA Loja, [2] Início, [3] Arquivo, [4] Sobre,
    // [5] #theme-rail (controls), [6] lang
    expect(count).toBeGreaterThanOrEqual(7);

    const cta = links.nth(0);
    await expect(cta).toHaveClass(/cta/);
    // O CTA carrega UTM por design (REGRA-AMARRACAO, 19/10): link cruzado sem UTM não é
    // medível. Antes o teste exigia o href exato sem query e reprovava a mudança correta.
    await expect(cta).toHaveAttribute('href', /^https:\/\/portifolio\.seu\.pet\?/);
    await expect(cta).toHaveAttribute('href', /utm_source=lifelog(&|$)/);
    await expect(cta).toHaveAttribute('href', /utm_medium=navbar/);

    const loja = links.nth(1);
    await expect(loja).toHaveAttribute('href', /^https:\/\/skills\.seu\.pet\?/);
    await expect(loja).toHaveAttribute('href', /utm_source=lifelog(&|$)/);
    await expect(loja).toHaveAttribute('href', /utm_medium=navbar/);
    await expect(loja).toHaveAttribute('href', /utm_campaign=amarracao/);

    await expect(links.nth(2)).toHaveAttribute('href', '/');
    await expect(links.nth(3)).toHaveAttribute('href', '/arquivo');
    await expect(links.nth(4)).toHaveAttribute('href', '/sobre');
    await expect(links.nth(5)).toHaveId('theme-rail');
    await expect(links.nth(6)).toHaveClass(/navbar-lang/);
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