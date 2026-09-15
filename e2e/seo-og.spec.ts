import { test, expect } from '@playwright/test';

// Regressão do handoff Arachne (14/09/2026): toda pagina precisa de og:image +
// twitter:image — sem elas o LinkedIn descarta o card e cai em fallback de
// busca pelo dominio. Paginas sem capa de post usam a imagem padrao 1200x630.

const SITE = 'https://lifelog-sepia.vercel.app';

test.describe('OG image em todas as paginas (handoff Arachne 14/09)', () => {
  const pagesWithoutCover = ['/', '/en/', '/sobre/', '/arquivo/', '/tag/dogwalk/', '/en/archive/'];

  for (const path of pagesWithoutCover) {
    test(`${path} emite og:image + twitter:image apontando para asset real`, async ({ page, request }) => {
      await page.goto(path);
      const og = page.locator('meta[property="og:image"]');
      await expect(og).toHaveCount(1);
      const content = await og.getAttribute('content');
      expect(content).toBeTruthy();
      // imagem padrao do site com dimensoes declaradas
      await expect(og).toHaveAttribute('content', `${SITE}/og-default.png`);
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
      await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', `${SITE}/og-default.png`);
      // o asset precisa existir no deploy (bot do LinkedIn faz GET nele)
      const resp = await request.get('/og-default.png');
      expect(resp.status()).toBe(200);
      expect(resp.headers()['content-type']).toMatch(/image\//);
    });
  }

  test('post publicado mantem a capa propria como og:image', async ({ page }) => {
    await page.goto('/post/2026-07-28-semana-da-qualidade-portfolio/');
    const content = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(content).toContain('/covers/');
    expect(content).not.toContain('og-default');
    await expect(page.locator('meta[property="og:image:width"]')).toHaveCount(0);
  });

  test('og:site_name e og:url presentes na home', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'LifeLog');
    const url = await page.locator('meta[property="og:url"]').getAttribute('content');
    expect(url).toBeTruthy();
  });
});
