import { test, expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SECRET = 'segredo-de-teste';
const POSTS_DIR = join(__dirname, '..', 'src', 'content', 'posts');

function frontmatter(file: string): Record<string, string> {
  const raw = readFileSync(join(POSTS_DIR, file), 'utf-8').replace(/\r\n/g, '\n');
  const bloco = raw.match(/^---\n([\s\S]*?)\n---/);
  const fm: Record<string, string> = {};
  for (const linha of (bloco?.[1] || '').split('\n')) {
    const kv = linha.match(/^([a-zA-Z_]+):\s*(.+)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
  }
  return fm;
}

const ARQUIVOS = readdirSync(POSTS_DIR).filter(f => f.endsWith('.mdx'));
const slugDe = (f: string) => f.replace(/\.mdx$/, '');

// Fixtures derivadas do acervo. Antes era um slug fixo que saiu do repo e
// deixou tres testes vermelhos por semanas (o arquivo nao existia mais, o
// sitemap nunca teria aquele texto). Slug fixo em fixture de conteudo apodrece.
const HIDDEN_SLUG = (() => {
  for (const f of ARQUIVOS) if (frontmatter(f).hidden === 'true') return slugDe(f);
  return 'post-oculto-inexistente';
})();

const PUBLIC_SLUG = (() => {
  for (const f of ARQUIVOS) if (frontmatter(f).hidden !== 'true') return slugDe(f);
  return 'home';
})();

// /api/* sao functions serverless (Vercel). O webServer do e2e e `astro preview`,
// que NAO executa functions — /api/* responde 404 ali. Detecta uma vez e marca
// skip com motivo visivel, em vez de pintar cinco testes de vermelho em toda
// rodada por um ambiente que nao existe (debito desde df361b4).
let apiDisponivel = false;
test.beforeAll(async ({ playwright, baseURL }) => {
  const ctx = await playwright.request.newContext({ baseURL });
  try {
    const r = await ctx.get('/api/session');
    apiDisponivel = r.status() !== 404;
  } catch {
    apiDisponivel = false;
  } finally {
    await ctx.dispose();
  }
});

const SKIP_API =
  'API serverless (/api/*) nao disponivel no astro preview — exercitar contra deploy Vercel';

test.describe('/ocultos', () => {
  test('GET /ocultos retorna 200', async ({ page }) => {
    await page.goto('/ocultos');
    await expect(page).toHaveTitle(/Lifelog|ocultos/i);
  });

  test('POST /api/session cria cookie com HMAC valido', async ({ request }) => {
    test.skip(!apiDisponivel, SKIP_API);
    const response = await request.post('/api/session', {
      data: { adminSecret: SECRET, title: HIDDEN_SLUG }
    });

    await expect(response.status()).toBe(200);

    const cookies = response.cookies();
    const sessionCookie = cookies.find(c => c.name === 'lifelog_ocultos');

    expect(sessionCookie).toBeDefined();
    expect(sessionCookie!.value).toContain('lifelog-ocultos-v1');
    expect(sessionCookie!.maxAge).toBe(43200);
  });

  test('GET /api/preview com cookie de sessao retorna HTML', async ({ request }) => {
    test.skip(!apiDisponivel, SKIP_API);
    const encodeCookie = (value: string) => {
      return Buffer.from(JSON.stringify({
        message: 'lifelog-ocultos-v1',
        cookie: value
      })).toString('base64');
    };

    const response = await request.get(`/api/preview/${HIDDEN_SLUG}`, {
      headers: {
        'Cookie': `lifelog_ocultos=${encodeCookie(SECRET)}`
      }
    });

    await expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<!DOCTYPE html>');
    expect(body).toContain(HIDDEN_SLUG);
  });

  test('GET /api/preview sem cookie valido retorna 401', async ({ request }) => {
    test.skip(!apiDisponivel, SKIP_API);
    const response = await request.get(`/api/preview/${HIDDEN_SLUG}`);
    await expect(response.status()).toBe(401);
  });
});

test.describe('/api/liberar', () => {
  test('POST /api/liberar libera post oculto', async ({ request, context }) => {
    test.skip(!apiDisponivel, SKIP_API);
    const page = await context.newPage();

    await page.goto('/ocultos');

    const releaseButton = page.locator('button:has-text("Liberar")');
    if (await releaseButton.count() > 0) {
      await releaseButton.click();

      await expect(page.locator('text=Post liberado')).toBeVisible({ timeout: 5000 });
    }
  });

  test('POST sem adminSecret retorna 401', async ({ request }) => {
    test.skip(!apiDisponivel, SKIP_API);
    const response = await request.post('/api/liberar', {
      data: { slug: HIDDEN_SLUG }
    });

    await expect(response.status()).toBe(401);
  });
});

test.describe('Verificacao de ocultos no frontend', () => {
  test('Posts ocultos nao aparecem na home', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator(`text=${HIDDEN_SLUG}`)).toHaveCount(0);
  });

  test('Posts ocultos nao aparecem no RSS', async ({ page }) => {
    await page.goto('/rss.xml');

    await expect(page.locator(`text=${HIDDEN_SLUG}`)).toHaveCount(0);
  });

  test('Posts liberados aparecem no sitemap', async ({ page }) => {
    // O teste antigo exigia o slug OCULTO no sitemap (contrassenso) e apontava
    // para um arquivo que nao existe mais. Agora prova o par real: publico
    // dentro, oculto fora.
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
    const xml = await response!.text();
    expect(xml).toContain(PUBLIC_SLUG);
    expect(xml).not.toContain(HIDDEN_SLUG);
  });

  // Regressao 13/11/2026: a lista /ocultos mostrava card SEM capa porque
  // scripts/ocultos-core.mjs montava o entry sem o campo `cover` e a pagina
  // nao tinha nenhuma <img>. O post tinha capa; o revisor nao via. Estes dois
  // testes travam o dado e a renderizacao.
  test('ocultos-data inclui o campo cover de cada post', async () => {
    // Le o artefato GERADO no build (api/ocultos-data.mjs) — a funcao serverless
    // /api/ocultos nao existe no `astro preview` estatico, entao bater na API
    // aqui testaria o servidor errado. O que precisa ser verdade e o dado.
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const file = path.resolve(process.cwd(), 'api', 'ocultos-data.mjs');
    const raw = await fs.readFile(file, 'utf-8');
    const json = raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1);
    const posts = JSON.parse(json);
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(Object.prototype.hasOwnProperty.call(post, 'cover')).toBe(true);
    }
    // o caso concreto que motivou o fix: post oculto COM capa declarada
    const comCapa = posts.filter((p) => p.cover && p.cover.startsWith('/covers/'));
    expect(comCapa.length).toBeGreaterThan(0);
  });

  test('/ocultos renderiza <img> de capa no card', async ({ page }) => {
    await page.goto('/ocultos/');
    // A pagina monta os cards via JS depois do login; aqui basta provar que o
    // template tem a tag de imagem de capa no bundle servido.
    const html = await page.content();
    const js = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.map((s) => s.textContent || '').join('\n');
    });
    expect(html + js).toMatch(/<img[^>]+entry\.cover|entry\.cover[^>]*<img|coverHtml/);
  });
});
