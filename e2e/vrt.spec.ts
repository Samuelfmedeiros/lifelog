import { test, expect } from './fixtures';

/**
 * Fase 4.2 — VRT (Visual Regression Testing)
 * Snapshots dos componentes visuais chave pra detectar regressões.
 *
 * IMPORTANTE: rodar com --update-snapshots na PRIMEIRA vez pra gerar baselines:
 *   pnpm exec playwright test --config=e2e/playwright.config.ts e2e/vrt.spec.ts --update-snapshots
 * Depois, rodar normal detecta qualquer mudança visual.
 *
 * Estabilização: injeta CSS que congela animações/partículas/aura durante o
 * snapshot — VRT de páginas animadas é instável sem isso.
 */
const FREEZE_ANIM = `
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .particles, [class*="particle"], [class*="aura"] { opacity: 0 !important; }
  /* A lista da home (.timeline) e DADO VIVO: todo post publicado troca cards, datas e
     desloca tudo abaixo. Sem congelar, o snapshot fica velho a cada publicacao — a
     baseline foi regerada 2x em 48h por isso (17 posts e depois 4). Altura FIXA (nao
     auto) garante que a caixa da mascara nao cresca junto com o conteudo, senao a
     proxima publicacao muda o tamanho da area mascarada e o diff volta. */
  .timeline { height: 600px !important; overflow: hidden !important; }
`;

/** A lista da home muda a cada publicacao — mascarar tira o dado vivo da comparacao.
 *  O layout da lista continua coberto por lifelog.spec.ts (contagem de cards,
 *  filtros por projeto/ano) e tags.spec.ts. Aqui o VRT mede o que e estavel:
 *  header, hero, busca, chips, navbar e a posicao do rodape. */
const maskVivo = (page: any) => [page.locator('.timeline')];

async function setupVRT(page: any, theme: 'dark' | 'light') {
  await page.addInitScript((t) => localStorage.setItem('lifelog-theme', t), theme);
  await page.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent = FREEZE_ANIM;
    document.head.appendChild(style);
  });
}

/** Espera fontes + imagens terminarem de carregar (VRT determinístico).
 *  NOTA: não usar networkidle — o WebSocket do Vite dev server nunca idles.
 *  NOTA 2: cada wait tem timeout próprio — fonts.ready/imagens podem nunca
 *  resolver em ambiente sandbox; não deixar o teste estourar o timeout global. */
async function waitForRender(page: any) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => Promise.race([
    document.fonts.ready,
    new Promise((res) => setTimeout(res, 1500)),
  ]));
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map((img) => new Promise((res) => { img.onload = img.onerror = res; })),
      ),
      new Promise((res) => setTimeout(res, 1500)),
    ]),
  );
  await page.waitForTimeout(300);
}

test.describe('VRT — Regressão Visual', () => {
  test('home — tema dark (desktop)', async ({ page }) => {
    await setupVRT(page, 'dark');
    await page.goto('/');
    await waitForRender(page);
    await expect(page).toHaveScreenshot('home-dark.png', {
      maxDiffPixelRatio: 0.005, // 0.5% — animações congeladas
      mask: maskVivo(page),
    });
  });

  test('home — tema light (desktop)', async ({ page }) => {
    await setupVRT(page, 'light');
    await page.goto('/');
    await waitForRender(page);
    await expect(page).toHaveScreenshot('home-light.png', {
      maxDiffPixelRatio: 0.005,
      mask: maskVivo(page),
    });
  });

  test('navbar — tema dark', async ({ page }) => {
    await setupVRT(page, 'dark');
    await page.goto('/');
    await waitForRender(page);
    const navbar = page.locator('.navbar');
    await expect(navbar).toHaveScreenshot('navbar-dark.png', {
      maxDiffPixelRatio: 0.005,
    });
  });

  test('home — mobile (tema dark)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setupVRT(page, 'dark');
    await page.goto('/');
    await waitForRender(page);
    await expect(page).toHaveScreenshot('home-mobile-dark.png', {
      maxDiffPixelRatio: 0.005,
      mask: maskVivo(page),
    });
  });
});

