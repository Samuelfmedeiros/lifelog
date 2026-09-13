import { test, expect } from '@playwright/test';

// Regressão da caçada de 13/09 — SEO base, noindex de ocultos, sitemap/rss.
// Roda contra o preview server (:4321) com baseURL PT e EN normais.

const SITE = 'https://lifelog-sepia.vercel.app';

test.describe('SEO base (caçada 13/09)', () => {
  test('canonical presente e absoluto em post PT', async ({ page }) => {
    await page.goto('/post/capivara-cresce-dashboard-analytics-e-controle/');
    const c = page.locator('link[rel="canonical"]');
    await expect(c).toHaveCount(1);
    await expect(c).toHaveAttribute('href', `${SITE}/post/capivara-cresce-dashboard-analytics-e-controle/`);
  });

  test('hreflang PT/EN apontam um pro outro numa pagina de tag', async ({ page }) => {
    await page.goto('/tag/arachne/');
    await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute('href', `${SITE}/tag/arachne/`);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute('href', `${SITE}/en/tag/arachne/`);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
  });

  test('pagina EN tem canonical /og:locale EN', async ({ page }) => {
    await page.goto('/en/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/en/`);
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', '/en/rss.xml');
  });

  test('post publicado NAO leva noindex', async ({ page }) => {
    await page.goto('/post/seguranca-aprovado-sem-olhar/');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test('link interno do capivara-cresce nao usa /posts/ (404 histórico)', async ({ page }) => {
    await page.goto('/post/capivara-cresce-dashboard-analytics-e-controle/');
    await expect(page.locator('a[href^="/posts/"]')).toHaveCount(0);
    const link = page.locator('article a[href="/post/capivara-nasce-preciso-de-um-hub-pessoal-seguro/"]');
    await expect(link.first()).toBeVisible();
    const resp = await request.get('/post/capivara-nasce-preciso-de-um-hub-pessoal-seguro/');
    expect(resp.status()).toBe(200);
  });
});

test.describe('Ocultos fora do indice', () => {
  test('painel /ocultos responde 200 e leva meta noindex', async ({ page, request }) => {
    const resp = await request.get('/ocultos/');
    expect(resp.status()).toBe(200);
    await page.goto('/ocultos/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('preview de post oculto leva noindex nos dois idiomas', async ({ page }) => {
    await page.goto('/ocultos/preview/pt/seguranca-aprovado-sem-olhar/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await page.goto('/ocultos/preview/en/seguranca-aprovado-sem-olhar/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

test.describe('Feeds e sitemap por idioma', () => {
  test('/rss.xml so PT com language pt-br', async ({ request }) => {
    const resp = await request.get('/rss.xml');
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    expect(body).toContain('<language>pt-br</language>');
    expect(body).not.toContain('/en/post/');
    expect(body).toContain('/post/');
  });

  test('/en/rss.xml so EN com language en-us', async ({ request }) => {
    const resp = await request.get('/en/rss.xml');
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    expect(body).toContain('<language>en-us</language>');
    // itens apontam /en/post/ (o canal em si e /en/)
    const links = [...body.matchAll(/<link>(https:\/\/[^<]+)<\/link>/g)].map(m => m[1]).slice(1);
    expect(links.length).toBeGreaterThan(50);
    expect(links.every(l => l.includes('/en/post/'))).toBe(true);
  });

  test('sitemap URLs de post com trailing slash (casa com a rota)', async ({ request }) => {
    const resp = await request.get('/sitemap.xml');
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    expect(locs.length).toBeGreaterThan(100);
    for (const u of locs.filter(x => x.includes('/post/'))) {
      expect(u.endsWith('/')).toBe(true);
    }
  });

  test('robots.txt existe e manda nao indexar /ocultos', async ({ request }) => {
    const resp = await request.get('/robots.txt');
    expect(resp.status()).toBe(200);
    const body = await resp.text();
    expect(body).toContain('Disallow: /ocultos');
    expect(body).toContain('Sitemap:');
  });
});
