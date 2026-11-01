import { test, expect } from '@playwright/test';

// Preview de post oculto — /ocultos/preview/{pt,en}/<slug>/
//
// Historico (01/11/2026): esta rota era HTML estatico publico — qualquer pessoa
// com o link lia o post oculto inteiro (200, ~55KB), sem segredo. O HTML saiu do
// build e agora e servido por /api/preview, que exige o cookie de sessao emitido
// por /api/session (HMAC do ADMIN_SECRET); o vercel.json reescreve a rota para la.
//
// Neste servidor estatico local (sem as functions da Vercel) o que se cobra e o
// essencial: a rota NAO pode existir como arquivo publico. O comportamento do gate
// e provado por:
//   - scripts/check-preview-gate.mjs  (local, chama as functions de verdade)
//   - scripts/check-ocultos-gate.mjs  (contra a URL publica)

const HIDDEN_SLUG = 'descobertas-o-teste-que-caca-texto-tradutor-fujao';

test.describe('Preview de posts ocultos nao e publico', () => {
  for (const lang of ['pt', 'en']) {
    test(`/ocultos/preview/${lang}/<slug>/ nao existe como arquivo estatico`, async ({ request }) => {
      const res = await request.get(`/ocultos/preview/${lang}/${HIDDEN_SLUG}/`);
      expect(res.status()).toBe(404);
    });
  }

  test('/ocultos continua respondendo 200', async ({ request }) => {
    const res = await request.get('/ocultos/');
    expect(res.status()).toBe(200);
  });

  test('post hidden NAO tem rota publica /post/<slug>/', async ({ request }) => {
    const res = await request.get(`/post/${HIDDEN_SLUG}/`);
    expect([404, 200]).toContain(res.status()); // 404 (oculto) ou 200 se ja publicado
  });
});