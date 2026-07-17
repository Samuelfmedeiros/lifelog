import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* =============================================
   Dados DINÂMICOS — lê frontmatter dos MDX
   Toda execução de teste detecta novos posts
   automaticamente. Posts com draft:true pulados.
   ============================================= */

const POSTS_DIR = join(__dirname, '..', 'src', 'content', 'posts');

interface PostData {
  slug: string;
  title: string;
  project: string;
}

function parseFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, any> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      let val: any = kv[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      if (val === 'true') val = true;
      if (val === 'false') val = false;
      fm[kv[1]] = val;
    }
  }
  return fm;
}

function loadPosts(): PostData[] {
  const files = readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
  const posts: PostData[] = [];
  for (const file of files) {
    const content = readFileSync(join(POSTS_DIR, file), 'utf-8');
    const fm = parseFrontmatter(content);
    if (fm.draft) continue; // Pula rascunhos automaticamente
    posts.push({
      slug: file.replace(/\.mdx$/, ''),
      title: fm.title || '',
      project: fm.project || '',
    });
  }
  return posts;
}

// 🚀 Carregado dinamicamente! Testes nunca mais desatualizados.
const POSTS = loadPosts();

const PROJECT_PILLS = [
  'Todos', 'Arachne', 'Dogwalk', 'Portfólio', 'Capivara',
  'TatuEngine', 'Segurança', 'LifeLog', 'Estudos', 'Descobertas',
];

const NAV_LINKS = ['Início', 'Arquivo', 'Sobre'];

// Helper: count visible post cards
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

/* =============================================
   1. Homepage — carregamento e estrutura
   ============================================= */

test.describe('Homepage', () => {
  test('deve carregar com título e descrição', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/LifeLog/);
    await expect(page.locator('h1')).toContainText('LifeLog');
    await expect(page.locator('h1 + p + p')).toContainText('Dev · Projetos · Estudos · Descobertas');
  });

  test('deve exibir todos os 25 posts na timeline', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('.post-card');
    await expect(cards).toHaveCount(25);

    // Verificar date-separators (timeline)
    const separators = page.locator('.date-separator');
    expect(await separators.count()).toBeGreaterThanOrEqual(5);
  });

  test('deve ter filtros: busca textual e pills de projeto', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#filter-search')).toBeVisible();
    // Project pills — per-project buttons (10: Todos + 9 projects)
    const projectPills = page.locator('[data-filter-project]');
    expect(await projectPills.count()).toBe(PROJECT_PILLS.length);
  });

  test('deve exibir pills para todos os projetos', async ({ page }) => {
    await page.goto('/');
    for (const label of PROJECT_PILLS) {
      await expect(page.locator(`[data-filter-project]`, { hasText: label })).toBeVisible();
    }
  });

  test('deve ter links de navegação no header', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    for (const label of NAV_LINKS) {
      await expect(nav.locator('a', { hasText: label })).toBeVisible();
    }
    await expect(nav.locator('a[target="_blank"]')).toContainText('Portfólio');
  });
});

/* =============================================
   2. Páginas de Posts individuais (13 posts)
   ============================================= */

test.describe('Páginas de Posts', () => {
  for (const post of POSTS) {
    test(`"${post.slug}" deve renderizar corretamente`, async ({ page }) => {
      const response = await page.goto(`/post/${post.slug}/`);
      expect(response?.status()).toBe(200);

      // Título da página — check that page title contains the post title
      const pageTitle = await page.title();
      expect(pageTitle.toLowerCase()).toContain(post.title.toLowerCase());

      // Header do post
      await expect(page.locator('article[data-project]')).toBeVisible();
      await expect(page.locator('h1').first()).toBeVisible();

      // Tema do projeto via data-project
      const themeAttr = await page.locator('article').getAttribute('data-project');
      expect(themeAttr).toBe(post.project);

      // Metadados
      await expect(page.locator('time')).toBeVisible();

      // Tags
      const tags = page.locator('a[href^="/?tag="]');
      expect(await tags.count()).toBeGreaterThanOrEqual(1);

      // Breadcrumb "timeline"
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
  test('mostra título e stats', async ({ page }) => {
    await page.goto('/arquivo');
    await expect(page.locator('h1')).toContainText('Arquivo');
  });

  test('agrupa posts por ano', async ({ page }) => {
    await page.goto('/arquivo');
    const yearSections = page.locator('h2');
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
  test('mostra estatísticas: Posts=25, Projetos=6, Desde=2026', async ({ page }) => {
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
    expect(values.find(v => v.number === '25' && v.label === 'Posts')).toBeTruthy();
    // Projetos = unique projects with posts (6: arachne, dogwalk, portfolio, capivara, tatuengine, descobertas)
    const projValue = values.find(v => v.label === 'Projetos');
    expect(projValue).toBeTruthy();
    expect(projValue?.number).toBe('6');
    expect(parseInt(projValue!.number || '0')).toBeGreaterThanOrEqual(4);
    expect(values.find(v => v.label === 'Desde')).toBeTruthy();
  });

  test('links: Portfolio e RSS', async ({ page }) => {
    await page.goto('/sobre');

    // Portfolio link — use the content ul's portfolio link
    const portfolioLink = page.locator('article a[href*="samuelmedeiros"]').first();
    await expect(portfolioLink).toBeVisible();

    // RSS link — use first (content area)
    const rssLink = page.locator('article a[href="/rss.xml"]').first();
    await expect(rssLink).toBeVisible();
  });

  test('terminal widget interativo funciona', async ({ page }) => {
    await page.goto('/sobre');
    await expect(page.locator('.terminal-widget')).toBeVisible();
  });
});

/* =============================================
   5. RSS Feed
   ============================================= */

test.describe('RSS Feed', () => {
  test('XML válido com 25 posts', async ({ page }) => {
    const response = await page.goto('/rss.xml');
    expect(response?.ok()).toBeTruthy();
    expect(response?.headers()['content-type'] || '').toContain('xml');

    const text = await response!.text();
    expect(text).toContain('<?xml');
    expect(text).toContain('<rss');
    expect(text).toContain('<channel>');

    const items = (text.match(/<item>/g) || []).length;
    expect(items).toBe(25);

    // Todos os slugs e contexto de títulos presentes
    for (const post of POSTS) {
      expect(text).toContain(post.slug);
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
    const dogwalkCount = POSTS.filter(p => p.project === 'dogwalk').length;
    await page.locator('#filter-search').fill('Dogwalk');
    await page.waitForTimeout(200);
    const count = await visiblePosts(page);
    expect(count).toBeGreaterThanOrEqual(dogwalkCount);

    const titles = await visiblePostTitles(page);
    expect(titles.some(t => t.toLowerCase().includes('dogwalk'))).toBeTruthy();
  });

  test('filtro de projeto "Arachne" mostra posts corretos', async ({ page }) => {
    const expected = POSTS.filter(p => p.project === 'arachne').length;
    await page.locator('[data-filter-project="arachne"]').click();
    await page.waitForTimeout(200);
    const count = await visiblePosts(page);
    expect(count).toBeGreaterThanOrEqual(expected);
  });

  test('filtro de projeto "Capivara" mostra posts corretos', async ({ page }) => {
    const expected = POSTS.filter(p => p.project === 'capivara').length;
    await page.locator('[data-filter-project="capivara"]').click();
    await page.waitForTimeout(200);
    const count = await visiblePosts(page);
    expect(count).toBe(expected);
  });

  test('filtro de projeto + busca combinados (Dogwalk + infra)', async ({ page }) => {
    await page.locator('[data-filter-project="dogwalk"]').click();
    await page.waitForTimeout(100);
    await page.locator('#filter-search').fill('infra');
    await page.waitForTimeout(200);
    const count = await visiblePosts(page);
    expect(count).toBe(1); // só primeiros-passos-infra-dogwalk
  });

  test('"Todos" reset mostra todos os posts', async ({ page }) => {
    const arachnPosts = POSTS.filter(p => p.project === 'arachne').length;
    await page.locator('[data-filter-project="arachne"]').click();
    await page.waitForTimeout(100);
    expect(await visiblePosts(page)).toBe(arachnPosts);

    await page.locator('[data-filter-project="all"]').click();
    await page.waitForTimeout(100);
    expect(await visiblePosts(page)).toBe(POSTS.length);
  });

  test('filtro de texto "Estudos" não encontra posts (nenhum estudo publicado)', async ({ page }) => {
    await page.locator('#filter-search').fill('Estudo');
    await page.waitForTimeout(200);
    const count = await visiblePosts(page);
    expect(count).toBe(0); // nenhum post de estudos publicado
  });

  test('estado vazio quando nenhum post corresponde', async ({ page }) => {
    await page.locator('#filter-search').fill('xyz-nao-existe-123');
    await page.waitForTimeout(200);
    expect(await visiblePosts(page)).toBe(0);
  });

  test('filtro de projeto TatuEngine mostra posts corretos', async ({ page }) => {
    const expected = POSTS.filter(p => p.project === 'tatuengine').length;
    await page.locator('[data-filter-project="tatuengine"]').click();
    await page.waitForTimeout(200);
    expect(await visiblePosts(page)).toBe(expected);
  });

  test('filtro de projeto Segurança mostra 0 posts (ainda sem posts)', async ({ page }) => {
    await page.locator('[data-filter-project="seguranca"]').click();
    await page.waitForTimeout(200);
    expect(await visiblePosts(page)).toBe(0);
  });

  test('filtro de projeto LifeLog mostra 0 posts (ainda sem posts)', async ({ page }) => {
    await page.locator('[data-filter-project="lifelog"]').click();
    await page.waitForTimeout(200);
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

  test('home → post → voltar via timeline', async ({ page }) => {
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
    await page.goto('/post/dogwalk-amadurece-testes-playwright/');
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
    expect(await page.locator('.post-card').count()).toBe(POSTS.length);
    const w = await page.locator('.post-card').first().evaluate(el => el.offsetWidth);
    expect(w).toBeGreaterThan(300);
  });

  test('filtros funcionam em mobile', async ({ page }) => {
    await page.goto('/');
    await page.locator('#filter-search').fill('Arachne');
    await page.waitForTimeout(200);
    expect(await visiblePosts(page)).toBeGreaterThanOrEqual(2);
  });

  test('post page legível', async ({ page }) => {
    await page.goto('/post/primeiros-passos-infra-dogwalk/');
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
   9. Temas por Projeto (data-project no html)
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
   10. Theme Toggle (light/dark)
   ============================================= */

test.describe('Theme Toggle', () => {
  test('troca entre dark e light ao clicar no rail', async ({ page }) => {
    await page.goto('/');

    // Theme button is always visible (no popover needed)
    const themeBtn = page.locator('#rail-theme');
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    await page.waitForTimeout(500);

    // Should have switched to light
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme).toBe('light');

    // Toggle back to dark
    await themeBtn.click();
    await page.waitForTimeout(500);
    const theme2 = await page.locator('html').getAttribute('data-theme');
    expect(theme2).toBe('dark');
  });
});

/* =============================================
   11. Projeto TatuEngine na home
   ============================================= */

test.describe('TatuEngine', () => {
  test('pill TatuEngine existe na home', async ({ page }) => {
    await page.goto('/');
    const pill = page.locator('[data-filter-project="tatuengine"]');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText('TatuEngine');
  });

  test('pattern wavefield.svg existe', async ({ page }) => {
    const response = await page.goto('/patterns/wavefield.svg');
    expect(response?.ok()).toBeTruthy();
  });
});

/* =============================================
   12. Segurança
   ============================================= */

test.describe('Segurança', () => {
  test('pill Segurança existe na home', async ({ page }) => {
    await page.goto('/');
    const pill = page.locator('[data-filter-project="seguranca"]');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText('Segurança');
  });

  test('pattern shield.svg existe', async ({ page }) => {
    const response = await page.goto('/patterns/shield.svg');
    expect(response?.ok()).toBeTruthy();
  });
});

/* =============================================
   13. LifeLog como projeto
   ============================================= */

test.describe('LifeLog como Projeto', () => {
  test('pill LifeLog existe na home', async ({ page }) => {
    await page.goto('/');
    const pill = page.locator('[data-filter-project="lifelog"]');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText('LifeLog');
  });

  test('pattern scribble.svg existe', async ({ page }) => {
    const response = await page.goto('/patterns/scribble.svg');
    expect(response?.ok()).toBeTruthy();
  });
});

/* =============================================
   14. Erro 404
   ============================================= */

test.describe('404', () => {
  test('rota inexistente retorna 404', async ({ page }) => {
    const response = await page.goto('/pagina-inexistente');
    expect(response?.status()).toBe(404);
  });
});

/* =============================================
   15. Performance e health
   ============================================= */

test.describe('Health', () => {
  test('homepage carrega em < 8s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    expect(Date.now() - start).toBeLessThan(8000);
  });

  test('sem erros de console na navegação', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.goto('/arquivo');
    await page.goto('/sobre');
    await page.goto('/post/arachne-nasceu-frustracao-scrapers/');

    expect(errors).toEqual([]);
  });
});
