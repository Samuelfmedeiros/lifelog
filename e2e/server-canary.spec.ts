import { test, expect } from './fixtures';

/**
 * Canário de servidor — campanha de loop 23/10/2026.
 *
 * Quando nenhum preview responde, TODOS os e2e falham com
 * net::ERR_CONNECTION_REFUSED e o relatório externo vira
 * "e2e playwright falhou:" sem detalhe nenhum (545 falhas iguais).
 * Este spec falha em segundos com mensagem que aponta a causa:
 * se ele falhar, o problema é o servidor/config — não os testes.
 */
test.describe('Canário de servidor', () => {
  test('preview responde 200 na home com o HTML do LifeLog', async ({ page }) => {
    const response = await page.goto('/');
    expect(
      response?.status(),
      'nenhum servidor na baseURL — o webServer do playwright.config não subiu o preview?',
    ).toBe(200);
    await expect(page).toHaveTitle(/LifeLog/);
  });

  test('assets estáticos servidos (CSS não vazio)', async ({ page, request }) => {
    await page.goto('/');
    // O primeiro link[rel=stylesheet] da home é o Google Fonts — filtrar
    // pelo asset bundlado pelo Astro, senão o locator resolve o link errado.
    const css = page.locator('link[rel="stylesheet"][href*="/_astro/"]');
    const href = await css.first().getAttribute('href');
    expect(href, 'nenhum CSS bundle /_astro/ na home').toBeTruthy();
    // "não vazio" de verdade: baixa o asset e confere o conteúdo servido.
    const response = await request.get(href!);
    expect(response.status(), `GET ${href}`).toBe(200);
    const body = await response.text();
    expect(body.length, 'CSS servido vazio').toBeGreaterThan(0);
  });

  test('nenhum recurso same-origin falha na home (diagnóstico de rede)', async ({ page }) => {
    // Campanha 23/10: quando o servidor morre no meio da rodada, os specs
    // falham com net::ERR_* e o relatório vira "e2e playwright falhou:" vazio.
    // Este teste coleta TODA falha de requisição same-origin na home com
    // URL + erro — se ele falhar, o output diz exatamente o que caiu.
    const failed: { url: string; error: string | undefined }[] = [];
    page.on('requestfailed', (req) => {
      failed.push({ url: req.url(), error: req.failure()?.errorText });
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const origin = new URL(page.url()).origin;
    const sameOrigin = failed.filter((f) => {
      try {
        return new URL(f.url).origin === origin;
      } catch {
        return false;
      }
    });
    expect(
      sameOrigin.map((f) => `${f.url} :: ${f.error}`).join('\n'),
      'requisições same-origin falharam',
    ).toBe('');
  });
});
