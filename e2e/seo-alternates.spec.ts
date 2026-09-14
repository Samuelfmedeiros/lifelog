import { test, expect } from '@playwright/test';

// Regressao dos bugs de SEO bilingue da cacada de 13/09/2026 (smoke test leve —
// a cobertura exaustiva fica no scripts/check-alternates.py, que roda no CI sobre o dist).
//  - hreflang apontando para pagina inexistente
//  - icones PWA do manifest.json dando 404
//  - 404 sem noindex

test.describe('SEO bilíngue — smoke', () => {
  test('hreflang do head aponta para paginas que existem', async ({ page, request }) => {
    for (const p of ['/', '/en/']) {
      await page.goto(p, { waitUntil: 'domcontentloaded' });
      const links = await page.$$eval('link[rel="alternate"][hreflang]', (els) =>
        els.map((e) => ({ hl: e.getAttribute('hreflang')!, href: e.getAttribute('href')! })),
      );
      expect(links.length, `sem hreflang em ${p}`).toBeGreaterThan(0);

      const paths = [...new Set(links.map((l) => new URL(l.href).pathname))];
      for (const path of paths) {
        const r = await request.get(path);
        expect(r.status(), `${p} -> hreflang ${path}`).toBeLessThan(400);
      }
    }
  });

  test('icones do manifest existem', async ({ request }) => {
    for (const ic of ['/icons/lifelog-192.png', '/icons/lifelog-512.png']) {
      const r = await request.get(ic);
      expect(r.status(), ic).toBe(200);
      expect(r.headers()['content-type'], ic).toContain('image/png');
    }
  });

  test('paginas 404 nao sao indexaveis', async ({ page }) => {
    for (const p of ['/404.html', '/en/404/']) {
      await page.goto(p, { waitUntil: 'domcontentloaded' });
      const robots = await page.getAttribute('meta[name="robots"]', 'content');
      expect(robots, p).toContain('noindex');
    }
  });
});
