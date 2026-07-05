import { test, expect } from '@playwright/test';

/* =============================================
   Dados reais do site
   ============================================= */

const POSTS = [
  { slug: 'ot-token-engine', title: 'OT Token — A nova engine de busca do Arachne', project: 'arachne' },
  { slug: 'portfolio-redesign-sci-fi', title: 'Redesign do Portfólio 2.0 — Tema Sci-Fi Ciano e Preto', project: 'portfolio' },
  { slug: 'capivara-mvp-financas', title: 'Capivara — MVP do gerenciador financeiro', project: 'capivara' },
  { slug: 'dogwalk-playwright-e2e', title: 'Dogwalk v2 — Testes E2E com Playwright', project: 'dogwalk' },
  { slug: 'ssm-drift-estudo', title: 'SSMs vs Transformers — O drift do estado oculto', project: 'estudos' },
  { slug: 'vhs-antiguidades', title: 'Feira de antiguidades — Fitas VHS lacradas', project: 'descobertas' },
];

const PROJECT_BUTTONS = 8; // Todos + 7 projetos (including "dev")
const NAV = ['Início', 'Arquivo', 'Sobre'];

// Helper: count visible post cards (posts hidden via style.display)
async function visiblePosts(page: any) {
  return page.locator('.post-card').evaluateAll(
    (els: HTMLElement[]) => els.filter(el => el.style.display !== 'none').length
  );
}

// Helper: get visible post title texts
async function visiblePostTitles(page: any) {
  return page.locator('.post-card').evaluateAll(
    (els: HTMLElement[]) => els
      .filter(el => el.style.display !== 'none')
      .map(el => el.querySelector('h2')?.textContent?.trim() || '')
  );
}

// Helper: check if empty-state exists and is visible
async function emptyStateVisible(page: any) {
  const el = page.locator('#empty-state');
  const exists = await el.count() > 0;
  if (!exists) return false;
  return el.evaluate((e: HTMLElement) => e.style.display !== 'none');
}

/* =============================================
   1. Homepage — carregamento e estrutura
   ============================================= */

test.describe('Homepage', () => {
  test('deve carregar com título e descrição', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LifeLog/);
    await expect(page.locator('h1')).toContainText('LifeLog');
    await expect(page.locator('h1 + p strong', { hasText: 'Samuel Medeiros' })).toBeVisible();
    await expect(page.locator('h1 + p + p')).toContainText('Dev · Cibersegurança · Projetos · Descobertas');
  });

  test('deve exibir todos os 6 posts na timeline', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.post-card');
    await expect(cards).toHaveCount(6);

    // Verificar que tem date-separators (timeline)
    const separators = page.locator('.date-separator');
    expect(await separators.count()).toBeGreaterThanOrEqual(5);
  });

  test('deve ter filtros: busca, projeto e ano', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#filter-search')).toBeVisible();
    await expect(page.locator('[data-filter-project]')).toHaveCount(PROJECT_BUTTONS);
    const yearBtns = page.locator('[data-filter-year]');
    expect(await yearBtns.count()).toBeGreaterThanOrEqual(2); // all + 2026
  });

  test('deve ter links de navegação no header', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    for (const label of NAV) {
      await expect(nav.locator('a', { hasText: label })).toBeVisible();
    }
    await expect(nav.locator('a[target="_blank"]')).toContainText('Portfólio');
  });
});

/* =============================================
   2. Páginas de Posts individuais
   ============================================= */

test.describe('Páginas de Posts', () => {
  for (const post of POSTS) {
    test(`"${post.slug}" deve renderizar corretamente`, async ({ page }) => {
      const response = await page.goto(`/post/${post.slug}/`);
      expect(response?.status()).toBe(200);

      // Título da página
      await expect(page).toHaveTitle(new RegExp(post.title));

      // Cabeçalho do post
      await expect(page.locator('article[data-project]')).toBeVisible();
      await expect(page.locator('h1')).toContainText(post.title);

      // Tema do projeto via data-project
      const themeAttr = await page.locator('article').getAttribute('data-project');
      expect(themeAttr).toBe(post.project);

      // Metadados
      await expect(page.locator('time')).toBeVisible();
      await expect(page.locator('text=min de leitura')).toBeVisible();

      // Tags
      const tags = page.locator('a[href^="/?tag="]');
      expect(await tags.count()).toBeGreaterThanOrEqual(1);

      // Back link "timeline" (breadcrumb)
      await expect(page.locator('a[href="/"]', { hasText: 'timeline' }).first()).toBeVisible();

      // Conteúdo
      const prose = page.locator('.prose');
      await expect(prose).toBeVisible();
      expect(await prose.evaluate((el: HTMLElement) => el.textContent?.length || 0)).toBeGreaterThan(50);
    });
  }
});

/* =============================================
   3. Arquivo
   ============================================= */

test.describe('Arquivo', () => {
  test('mostra total de posts e cards de projeto', async ({ page }) => {
    await page.goto('/arquivo');
    await expect(page.locator('h1')).toContainText('Arquivo');
    await expect(page.locator('text=6 posts')).toBeVisible();

    // Cards de stats
    const statCards = page.locator('div.grid.grid-cols-2 > div');
    expect(await statCards.count()).toBeGreaterThanOrEqual(6);
  });

  test('agrupa posts por ano', async ({ page }) => {
    await page.goto('/arquivo');
    const yearSections = page.locator('section.mb-10');
    // All posts are 2026, so at least 1 section
    expect(await yearSections.count()).toBeGreaterThanOrEqual(1);
  });

  test('links de posts navegam corretamente', async ({ page }) => {
    await page.goto('/arquivo');
    const firstLink = page.locator('section.mb-10 a[href^="/post/"]').first();
    await firstLink.click();
    await page.waitForURL(/\/post\//);
    await expect(page.locator('h1')).toBeVisible();
  });
});

/* =============================================
   4. Sobre
   ============================================= */

test.describe('Sobre', () => {
  test('mostra estatísticas: Posts=6, Projetos=6, Desde=2026', async ({ page }) => {
    await page.goto('/sobre');
    await expect(page.locator('h1')).toContainText('Sobre o LifeLog');

    // 3 stat cards em grid-cols-3
    const statCards = page.locator('.grid.grid-cols-3 > div');
    expect(await statCards.count()).toBe(3);

    // Verificar valores
    const values = await statCards.evaluateAll((cards: HTMLElement[]) =>
      cards.map(c => ({
        number: c.querySelector('p:first-child')?.textContent?.trim(),
        label: c.querySelector('p:last-child')?.textContent?.trim(),
      }))
    );
    expect(values.find(v => v.number === '6' && v.label === 'Posts')).toBeTruthy();
    expect(values.find(v => v.number === '6' && v.label === 'Projetos')).toBeTruthy();
    expect(values.find(v => v.number === '2026')).toBeTruthy();
  });

  test('links: Portfolio e RSS', async ({ page }) => {
    await page.goto('/sobre');

    // Content area links (not nav)
    const contentLinks = page.locator('article ul a');
    await expect(contentLinks.first()).toBeVisible();
    expect(await contentLinks.count()).toBe(2);

    // Portfolio link (inside content ul)
    const portfolioLink = page.locator('article ul a[href*="samuelmedeiros"]');
    await expect(portfolioLink).toBeVisible();

    // RSS link (inside content ul)
    const rssLink = page.locator('article ul a[href="/rss.xml"]');
    await expect(rssLink).toBeVisible();
  });
});

/* =============================================
   5. RSS Feed
   ============================================= */

test.describe('RSS Feed', () => {
  test('XML válido com 6 posts', async ({ page }) => {
    const response = await page.goto('/rss.xml');
    expect(response?.ok()).toBeTruthy();
    expect(response?.headers()['content-type'] || '').toContain('xml');

    const text = await response!.text();
    expect(text).toContain('<?xml');
    expect(text).toContain('<rss');
    expect(text).toContain('<channel>');

    const items = (text.match(/<item>/g) || []).length;
    expect(items).toBe(6);

    // Todos os slugs e títulos presentes
    for (const post of POSTS) {
      expect(text).toContain(post.slug);
      expect(text).toContain(post.title);
    }
  });
});

/* =============================================
   6. Filtros (client-side JS)
   ============================================= */

test.describe('Filtros', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('busca textual filtra posts', async ({ page }) => {
    await page.locator('#filter-search').fill('Dogwalk');
    await page.waitForTimeout(100); // JS filter processing
    expect(await visiblePosts(page)).toBe(1);

    const titles = await visiblePostTitles(page);
    expect(titles[0]).toContain('Dogwalk');
  });

  test('busca por "Estudo" mostra resultado', async ({ page }) => {
    await page.locator('#filter-search').fill('Estudo');
    await page.waitForTimeout(100);
    expect(await visiblePosts(page)).toBe(1); // só o post "estudos" via project?.includes("estudo")
  });

  test('filtro de projeto "estudos" mostra 1 post', async ({ page }) => {
    await page.locator('[data-filter-project="estudos"]').click();
    await page.waitForTimeout(100);
    expect(await visiblePosts(page)).toBe(1);
  });

  test('filtro de projeto "portfolio" mostra 1 post', async ({ page }) => {
    await page.locator('[data-filter-project="portfolio"]').click();
    await page.waitForTimeout(100);
    expect(await visiblePosts(page)).toBe(1);
  });

  test('filtro de projeto + busca combinados', async ({ page }) => {
    await page.locator('[data-filter-project="estudos"]').click();
    await page.waitForTimeout(50);
    await page.locator('#filter-search').fill('Token');
    await page.waitForTimeout(100);
    expect(await visiblePosts(page)).toBe(0); // "Token" não está em posts de estudos
  });

  test('"Todos" reset mostra todos os 6 posts', async ({ page }) => {
    await page.locator('[data-filter-project="capivara"]').click();
    await page.waitForTimeout(50);
    expect(await visiblePosts(page)).toBe(1);

    await page.locator('[data-filter-project="all"]').click();
    await page.waitForTimeout(50);
    expect(await visiblePosts(page)).toBe(6);
  });

  test('filtro de ano mostra 6 posts (só tem 2026)', async ({ page }) => {
    await page.locator('[data-filter-year="2026"]').click();
    await page.waitForTimeout(100);
    expect(await visiblePosts(page)).toBe(6);
  });

  test('botão de ano mantém classe active', async ({ page }) => {
    const btn = page.locator('[data-filter-year="2026"]');
    await btn.click();
    await page.waitForTimeout(50);
    expect(await btn.evaluate(el => el.classList.contains('active'))).toBeTruthy();
  });

  test('estado vazio quando nenhum post corresponde', async ({ page }) => {
    await page.locator('#filter-search').fill('xyz-nao-existe');
    await page.waitForTimeout(100);
    expect(await visiblePosts(page)).toBe(0);
  });
});

/* =============================================
   7. Navegação
   ============================================= */

test.describe('Navegação', () => {
  test('header links navegam entre páginas', async ({ page }) => {
    await page.goto('/');

    // Início → Arquivo
    await page.locator('nav a', { hasText: 'Arquivo' }).click();
    await expect(page).toHaveURL(/\/arquivo/);
    await expect(page.locator('h1')).toContainText('Arquivo');

    // Arquivo → Sobre
    await page.locator('nav a', { hasText: 'Sobre' }).click();
    await expect(page).toHaveURL(/\/sobre/);
    await expect(page.locator('h1')).toContainText('Sobre');

    // Sobre → Início
    await page.locator('nav a', { hasText: 'Início' }).click();
    await expect(page).toHaveURL('/');
  });

  test('home → post → voltar', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.locator('.post-card a').first();
    const href = await firstCard.getAttribute('href');
    await firstCard.click();
    await page.waitForURL(`**${href}`);
    await expect(page.locator('h1')).toBeVisible();

    // Voltar via "timeline" link
    await page.locator('a[href="/"]', { hasText: 'timeline' }).first().click();
    await expect(page).toHaveURL('/');
  });

  test('breadcrumb "timeline" no post', async ({ page }) => {
    await page.goto('/post/dogwalk-playwright-e2e/');
    const timeline = page.locator('a[href="/"]', { hasText: 'timeline' }).first();
    await expect(timeline).toBeVisible();
    await timeline.click();
    await expect(page).toHaveURL('/');
  });

  test('link do Portfolio abre em nova aba', async ({ page }) => {
    await page.goto('/');
    const portfolio = page.locator('nav a[target="_blank"]');
    await expect(portfolio).toBeVisible();
    await expect(portfolio).toHaveAttribute('href', /samuelmedeiros/);
  });
});

/* =============================================
   8. Responsivo (mobile)
   ============================================= */

test.describe('Responsivo (Mobile)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('homepage legível', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.locator('.post-card').count()).toBe(6);
    // Cards ocupam largura quase total
    const w = await page.locator('.post-card').first().evaluate(el => el.offsetWidth);
    expect(w).toBeGreaterThan(300);
  });

  test('filtros funcionam em mobile', async ({ page }) => {
    await page.goto('/');
    await page.locator('#filter-search').fill('Capivara');
    await page.waitForTimeout(100);
    expect(await visiblePosts(page)).toBe(1);
  });

  test('post page legível', async ({ page }) => {
    await page.goto('/post/portfolio-redesign-sci-fi/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.prose')).toBeVisible();
    const w = await page.locator('.prose').evaluate(el => el.offsetWidth);
    expect(w).toBeGreaterThan(250);
  });

  test('navegação funciona', async ({ page }) => {
    await page.goto('/');
    await page.locator('nav a', { hasText: 'Arquivo' }).click();
    await expect(page).toHaveURL(/\/arquivo/);
    await page.locator('nav a', { hasText: 'Início' }).click();
    await expect(page).toHaveURL('/');
  });
});

/* =============================================
   9. Temas por Projeto
   ============================================= */

test.describe('Temas por Projeto', () => {
  for (const post of POSTS) {
    test(`"${post.slug}" tem data-project="${post.project}"`, async ({ page }) => {
      const response = await page.goto(`/post/${post.slug}/`);
      expect(response?.status()).toBe(200);

      // <html> tem data-project correto
      const html = await page.locator('html').getAttribute('data-project');
      expect(html).toBe(post.project);

      // <article> também tem
      const article = await page.locator('article').getAttribute('data-project');
      expect(article).toBe(post.project);
    });
  }
});

/* =============================================
   10. Erro 404
   ============================================= */

test.describe('404', () => {
  test('rota inexistente retorna 404', async ({ page }) => {
    const response = await page.goto('/pagina-inexistente');
    expect(response?.status()).toBe(404);
  });
});

/* =============================================
   11. Performance e health
   ============================================= */

test.describe('Health', () => {
  test('homepage carrega em < 3s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    expect(Date.now() - start).toBeLessThan(3000);
  });

  test('sem erros de console na navegação', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.goto('/arquivo');
    await page.goto('/sobre');
    await page.goto('/post/dogwalk-playwright-e2e/');

    expect(errors).toEqual([]);
  });
});
