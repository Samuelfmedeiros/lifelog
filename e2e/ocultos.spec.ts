import { test, expect } from '@playwright/test';

// Contrato de /ocultos que o `pnpm preview` consegue provar.
//
// 02/11/2026 — porque os testes de API sairam deste spec:
// POST /api/session, GET /api/preview e POST /api/liberar respondem 404 sob
// `pnpm preview` (o astro preview nao executa as functions da Vercel). O
// contrato da API e provado por scripts/check-preview-gate.mjs, que importa as
// functions REAIS com segredo de teste e roda no CI (deploy.yml, step
// "check-preview-gate"). Este spec veio de um PR cancelado (#241) e nunca
// rodou no ambiente certo — duplicar aqui era vermelho garantido.
//
// Espelho PT/EN (estado deliberado, nao e bug): um post pode ter a versao PT em
// src/content/ocultos/ — fora da collection `posts`, invisivel no blog — e a
// traducao EN publica em src/content/posts/en/ com hidden:false. O que precisa
// valer sempre: a versao OCULTA nao aparece onde so entra o que e publico.

// Slugs com a versao PT em src/content/ocultos/ (fora da collection `posts`).
const OCULTOS_PT = [
  'descobertas-o-botao-que-refazia-posts',
  'lifelog-o-commit-unico',
  'lifelog-tres-concertos-uma-causa',
  'o-teste-que-nao-sabia-dos-posts-ocultos',
];

// Post liberado nas duas linguas (publico): precisa aparecer no sitemap.
const RELEASED_SLUG = 'descobertas-o-teste-que-caca-texto-tradutor-fujao';

test.describe('/ocultos', () => {
  test('GET /ocultos retorna 200', async ({ page }) => {
    await page.goto('/ocultos');
    await expect(page).toHaveTitle(/Lifelog|ocultos/i);
  });
});

test.describe('Verificacao de ocultos no frontend', () => {
  test('posts com PT oculto nao aparecem na home', async ({ page }) => {
    await page.goto('/');
    for (const slug of OCULTOS_PT) {
      await expect(page.locator(`text=${slug}`)).toHaveCount(0);
    }
  });

  test('posts com PT oculto nao aparecem no feed PT', async ({ request }) => {
    const response = await request.get('/rss.xml');
    expect(response.status()).toBe(200);
    const text = await response.text();
    for (const slug of OCULTOS_PT) {
      expect(text).not.toContain(`/post/${slug}`);
    }
  });

  test('traducao EN publica segue no feed EN (espelho deliberado)', async ({ request }) => {
    const response = await request.get('/en/rss.xml');
    expect(response.status()).toBe(200);
    const text = await response.text();
    for (const slug of OCULTOS_PT) {
      expect(text).toContain(`/en/post/${slug}/`);
    }
  });

  test('post liberado aparece no sitemap', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain(`/post/${RELEASED_SLUG}/`);
    expect(text).toContain(`/en/post/${RELEASED_SLUG}/`);
  });
});
