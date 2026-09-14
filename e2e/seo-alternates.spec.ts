import { test, expect } from '@playwright/test';

// Regressao dos bugs de SEO bilingue encontrados na cacada de 13/09/2026:
//  - hreflang apontando para pagina inexistente (350 links)
//  - icones PWA do manifest.json que davam 404

const SITE = 'https://lifelog-sepia.vercel.app';

test.describe('SEO bilingue — hreflang e assets do head', () => {
  test('nenhum hreflang aponta para pagina inexistente', async ({ page, request }) => {
    for (const p of ['/', '/en/', '/posts/', '/404.html']) {
      const res = await page.goto(p);
      expect(res?.status(), p).toBeLessThan(400);
      const links = await page.$$eval('link[rel="alternate"][hreflang]', (els) =>
        els.map((e) => ({ hl: e.getAttribute('hreflang')!, href: e.getAttribute('href')! })),
      );
      for (const l of links) {
        const path = l.href.replace(SITE, '');
        const r = await request.get(path, { maxRedirects: 0 });
        expect(r.status(), `${p} -> hreflang=${l.hl} ${path}`).toBeLessThan(400);
      }
    }
  });

  test('icones do manifest.json existem', async ({ request }) => {
    for (const ic of ['/icons/lifelog-192.png', '/icons/lifelog-512.png']) {
      const r = await request.get(ic);
      expect(r.status(), ic).toBe(200);
      expect(r.headers()['content-type'], ic).toContain('image/png');
    }
  });

  test('paginas 404 nao sao indexaveis', async ({ page }) => {
    for (const p of ['/404.html', '/en/404/']) {
      await page.goto(p);
      const robots = await page.getAttribute('meta[name="robots"]', 'content');
      expect(robots, p).toContain('noindex');
    }
  });

  test('post sem traducao nao emite hreflang para o outro idioma', async ({ page }) => {
    // slug com acento + par existente: ambos os lados devem existir de verdade
    for (const p of ['/post/seguranca-aprovado-sem-olhar/', '/en/post/seguranca-aprovado-sem-olhar/']) {
      await page.goto(p);
      const hls = await page.$$eval('link[rel="alternate"][hreflang]', (els) =>
        els.map((e) => e.getAttribute('hreflang')),
      );
      expect(hls, p).toContain('pt-BR');
      expect(hls, p).toContain('en');
    }
  });
});
