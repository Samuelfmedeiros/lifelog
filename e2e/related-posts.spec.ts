import { test, expect } from './fixtures';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/* F1.1 — Plano de autoridade (21/10/2026): links internos no fim do post.
   Regra do componente: 3 posts do MESMO project (mesmo locale); fallback:
   completar com os mais recentes do locale. Exclui o próprio post. */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const POSTS_DIR = join(__dirname, '..', 'src', 'content', 'posts');

function parseFrontmatter(content: string): Record<string, any> {
  const norm = content.replace(/\r\n/g, '\n');
  const match = norm.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, any> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    let val: any = kv[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    if (val === 'true') val = true;
    if (val === 'false') val = false;
    fm[kv[1]] = val;
  }
  return fm;
}

interface Post { slug: string; project: string; hidden: boolean }

function load(locale: 'pt' | 'en'): Post[] {
  const dir = locale === 'en' ? join(POSTS_DIR, 'en') : POSTS_DIR;
  return readdirSync(dir)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .map(f => {
      const fm = parseFrontmatter(readFileSync(join(dir, f), 'utf-8'));
      return {
        slug: f.replace(/\.mdx?$/, ''),
        project: fm.project ?? 'sem-projeto',
        hidden: fm.hidden === true || fm.draft === true,
      };
    })
    .filter(p => !p.hidden);
}

const ptPosts = load('pt');
const enPosts = load('en');
const ptFixture = ptPosts.find(p => p.project === 'dogwalk') ?? ptPosts[0];
const enFixture = enPosts.find(p => p.slug === ptFixture.slug) ?? enPosts[0];

const countSameProject = (posts: Post[], project: string) =>
  posts.filter(p => p.project === project).length;

test.describe('Posts relacionados (F1.1 — linkagem interna)', () => {
  test('PT: seção existe com 3 links, mesmo projeto e sem auto-link', async ({ page }) => {
    await page.goto(`/post/${ptFixture.slug}/`);
    const section = page.locator('[aria-label="Leia também"]');
    await expect(section).toBeVisible();

    const hrefs = await section.locator('a').evaluateAll(as =>
      as.map(a => a.getAttribute('href') || '')
    );
    expect(hrefs).toHaveLength(3);

    // nunca linka para si mesmo
    expect(hrefs.some(h => h.includes(ptFixture.slug))).toBe(false);

    // PT linka PT (sem /en/)
    expect(hrefs.every(h => h.startsWith('/post/'))).toBe(true);

    // o fixture tem >= 3 do mesmo projeto => todos os 3 são do mesmo projeto
    if (countSameProject(ptPosts, ptFixture.project) >= 4) {
      const relatedSlugs = hrefs.map(h => h.replace('/post/', '').replace(/\/$/, ''));
      for (const slug of relatedSlugs) {
        const rel = ptPosts.find(p => p.slug === slug);
        expect(rel, `slug relacionado existe: ${slug}`).toBeTruthy();
        expect(rel!.project).toBe(ptFixture.project);
      }
    }
  });

  test('EN: seção traduzida e links dentro de /en/post/', async ({ page }) => {
    await page.goto(`/en/post/${enFixture.slug}/`);
    const section = page.locator('[aria-label="Related entries"]');
    await expect(section).toBeVisible();

    const hrefs = await section.locator('a').evaluateAll(as =>
      as.map(a => a.getAttribute('href') || '')
    );
    expect(hrefs).toHaveLength(3);
    expect(hrefs.every(h => h.startsWith('/en/post/'))).toBe(true);
  });

  test('nenhum link relacionado aponta para post oculto ou inexistente', async ({ page }) => {
    await page.goto(`/post/${ptFixture.slug}/`);
    const hrefs = await page
      .locator('[aria-label="Leia também"] a')
      .evaluateAll(as => as.map(a => a.getAttribute('href') || ''));

    for (const href of hrefs) {
      const res = await page.request.get(href);
      expect(res.status(), `link ${href} responde 200`).toBe(200);
    }
  });

  test('mobile: cards empilham sem overflow horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/post/${ptFixture.slug}/`);
    await page.locator('[aria-label="Leia também"]').scrollIntoViewIfNeeded();
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflow).toBe(false);
  });
});
