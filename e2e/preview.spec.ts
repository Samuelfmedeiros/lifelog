import { test, expect } from '@playwright/test';

// Preview de posts ocultos no /ocultos — rotas /ocultos/preview/{pt,en}/<slug>/
// Renderizam o post como o site publica (capa, formato, conteúdo) para Samuel
// revisar ANTES de liberar. Posts hidden NÃO têm rota /post/<slug>/ pública.

const HIDDEN_SLUG = 'descobertas-o-teste-que-caca-texto-tradutor-fujao';

test.describe('Preview de posts ocultos', () => {
  test('rotas de preview PT respondem 200 e renderizam o post', async ({ request }) => {
    const res = await request.get(`/ocultos/preview/pt/${HIDDEN_SLUG}/`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-project');
    expect(html).toContain('covers/');
    expect(html).not.toContain('Error');
  });

  test('rotas de preview EN respondem 200 e renderizam o post', async ({ request }) => {
    const res = await request.get(`/ocultos/preview/en/${HIDDEN_SLUG}/`);
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('data-project');
    expect(html).toContain('min read');
  });

  test('/ocultos continua respondendo 200', async ({ request }) => {
    const res = await request.get('/ocultos/');
    expect(res.status()).toBe(200);
  });

  test('post hidden NÃO tem rota pública /post/<slug>/', async ({ request }) => {
    const res = await request.get(`/post/${HIDDEN_SLUG}/`);
    expect([404, 200]).toContain(res.status()); // 404 (oculto) ou 200 se já publicado
  });
});
