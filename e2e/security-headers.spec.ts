import { test, expect } from '@playwright/test';

/**
 * DAST — Validação de Headers de Segurança (Fase 5.3)
 *
 * Roda contra a PRODUÇÃO (os headers são aplicados via vercel.json na Vercel,
 * não no dev server local). Usa a API de request (sem browser) pra checar
 * os headers de forma rápida e determinística.
 */
const PROD_URL = 'https://lifelog-sepia.vercel.app/';

test.describe('Security Headers (DAST)', () => {
  test('HSTS está presente', async ({ request }) => {
    const resp = await request.get(PROD_URL);
    expect(resp.status()).toBe(200);
    const hsts = resp.headers()['strict-transport-security'] || '';
    expect(hsts).toContain('max-age=');
    expect(hsts).toContain('includeSubDomains');
  });

  test('CSP está configurada (anti-XSS)', async ({ request }) => {
    const resp = await request.get(PROD_URL);
    expect(resp.status()).toBe(200);
    const csp = resp.headers()['content-security-policy'] || '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src");
    expect(csp).toContain("frame-ancestors");
  });

  test('X-Frame-Options ativo (anti-clickjacking)', async ({ request }) => {
    const resp = await request.get(PROD_URL);
    expect(resp.status()).toBe(200);
    const xfo = resp.headers()['x-frame-options'] || '';
    expect(xfo).toBe('SAMEORIGIN');
  });

  test('X-Content-Type-Options nosniff', async ({ request }) => {
    const resp = await request.get(PROD_URL);
    expect(resp.status()).toBe(200);
    expect(resp.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('Referrer-Policy definida', async ({ request }) => {
    const resp = await request.get(PROD_URL);
    expect(resp.status()).toBe(200);
    expect(resp.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('CSP não bloqueia o carregamento da home no browser', async ({ browser }) => {
    // Valida que a CSP configurada não quebra a página (sem erros de console
    // causados por violação de CSP: 'Refused to ... Content Security Policy')
    const page = await browser.newPage();
    const violations: string[] = [];
    page.on('console', (msg) => {
      if (msg.text().includes('Content Security Policy') || msg.text().includes('Refused to')) {
        violations.push(msg.text());
      }
    });
    await page.goto(PROD_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    expect(violations).toEqual([]);
    await page.close();
  });
});
