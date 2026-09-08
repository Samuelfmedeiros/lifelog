import { test, expect } from './fixtures';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * E2E — Páginas de tag (Opção C, 07/09/2026)
 * Requer preview server em :4321 (pnpm preview).
 * Valida: /tag/<slug> 200 com posts, chips clicáveis no post,
 * TagCloud do /arquivo apontando pra /tag/, consistência PT/EN.
 */

const POSTS_DIR = join(__dirname, '..', 'src', 'content', 'posts');

function parseFrontmatter(content: string): Record<string, any> {
  const norm = content.replace(/\r\n/g, '\n');
  const match = norm.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm: Record<string, any> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (!m) continue;
    let v: any = m[2].trim().replace(/^["']|["']$/g, '');
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    }
    if (v === 'true') v = true;
    if (v === 'false') v = false;
    fm[m[1]] = v;
  }
  return fm;
}

/** Todos os slugs de tag usados nos posts PT (não-draft). */
function collectTags(): Set<string> {
  const tags = new Set<string>();
  for (const f of readdirSync(POSTS_DIR).filter((f) => f.endsWith('.mdx'))) {
    const fm = parseFrontmatter(readFileSync(join(POSTS_DIR, f), 'utf-8'));
    if (fm.draft) continue;
    for (const t of fm.tags ?? []) tags.add(String(t));
  }
  return tags;
}

test.describe('páginas de tag /tag/<slug>', () => {
  const tags = [...collectTags()];

  test('existem tags coletadas dos posts', () => {
    expect(tags.length).toBeGreaterThan(50);
  });

  test('/tag/yurumi/ agrega posts do projeto', async ({ page }) => {
    const resp = await page.goto('/tag/yurumi/');
    expect(resp?.status()).toBe(200);
    await expect(page.locator('main')).toContainText(/yurumi/i);
    const cards = page.locator('main a[href^="/post/"], main a[href^="/en/post/"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(10);
  });

  test('/en/tag/yurumi/ existe e agrega os mesmos posts', async ({ page }) => {
    const resp = await page.goto('/en/tag/yurumi/');
    expect(resp?.status()).toBe(200);
    const cards = page.locator('main a[href^="/post/"], main a[href^="/en/post/"]');
    const countPT = await (async () => {
      const p = await page.goto('/tag/yurumi/');
      expect(p?.status()).toBe(200);
      return page.locator('main a[href^="/post/"], main a[href^="/en/post/"]').count();
    })();
    expect(await cards.count()).toBe(countPT);
  });

  test('amostra de 8 tags aleatórias responde 200 com ≥1 post', async ({ page }) => {
    const sample = tags.sort(() => Math.random() - 0.5).slice(0, 8);
    for (const t of sample) {
      const resp = await page.goto(`/tag/${t}/`);
      expect(resp?.status(), `/tag/${t}/`).toBe(200);
      const cards = page.locator('main a[href^="/post/"], main a[href^="/en/post/"]');
      expect(await cards.count(), `tag ${t} com posts`).toBeGreaterThanOrEqual(1);
    }
  });

  test('post tem chips de tag clicáveis levando a /tag/<slug>', async ({ page }) => {
    // pega um post PT conhecido do índice
    await page.goto('/');
    const firstPost = page.locator('a[href^="/post/"]').first();
    await firstPost.click();
    await page.waitForLoadState('load');
    const chips = page.locator('main a[href^="/tag/"]');
    const n = await chips.count();
    expect(n).toBeGreaterThanOrEqual(1);
    const href = await chips.first().getAttribute('href');
    expect(href).toMatch(/^\/tag\/[a-z0-9-]+\/?$/);
    const resp = await page.goto(href!);
    expect(resp?.status()).toBe(200);
  });

  test('TagCloud do /arquivo linka pra /tag/<slug>', async ({ page }) => {
    await page.goto('/arquivo');
    const cloudLinks = page.locator('a[href^="/tag/"]');
    expect(await cloudLinks.count()).toBeGreaterThanOrEqual(5);
  });

  test('tag inexistente cai em 404', async ({ page }) => {
    const resp = await page.goto('/tag/tag-que-nao-existe-nem-um-pouco/');
    expect(resp?.status()).toBe(404);
  });
});
