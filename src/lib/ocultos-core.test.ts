import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  serializeOcultos,
  parseOcultos,
  flipHidden,
  removePosts,
  createGithubCommitter,
  collectHidden,
  POSTS_DIR,
} from '../../scripts/ocultos-core.mjs';
import { twinCandidates } from '../../api/liberar.mjs';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('serializeOcultos / parseOcultos (round-trip byte-idêntico)', () => {
  const posts = [
    { path: 'foo.mdx', slug: 'foo', lang: 'pt', title: 'Foo', date: '2026-09-08', project: 'lifelog', content: 'corpo' },
    { path: 'en/en-foo.mdx', slug: 'en-foo', lang: 'en', title: 'Foo EN', date: '2026-09-08', project: '', content: '' },
  ];

  it('header gerado igual ao formato atual', () => {
    const s = serializeOcultos(posts);
    expect(s.startsWith('// Gerado automaticamente por scripts/gen-ocultos.mjs\n// NÃO editar manualmente\n\nexport default ')).toBe(true);
    expect(s.endsWith(';\n')).toBe(true);
  });

  it('parse → serialize = bytes idênticos', () => {
    const s1 = serializeOcultos(posts);
    const parsed = parseOcultos(s1);
    expect(parsed).toEqual(posts);
    expect(serializeOcultos(parsed)).toBe(s1);
  });

  it('parse aceita arquivo real (header + ; final)', () => {
    const real = '// Gerado automaticamente por scripts/gen-ocultos.mjs\n// NÃO editar manualmente\n\nexport default [\n  {\n    "path": "en/en-lifelog-o-ciclo-do-nao.mdx",\n    "slug": "en-lifelog-o-ciclo-do-nao",\n    "lang": "en"\n  }\n];\n';
    const parsed = parseOcultos(real);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].path).toBe('en/en-lifelog-o-ciclo-do-nao.mdx');
    expect(serializeOcultos(parsed)).toBe(real);
  });

  it('parse falha loud sem export default', () => {
    expect(() => parseOcultos('lixo')).toThrow(/export default/);
  });
});

describe('flipHidden', () => {
  it('flipa LF preservando o resto', () => {
    const raw = '---\ntitle: X\nhidden: true\ndate: 2026-09-08\n---\n\ncorpo\n';
    const r = flipHidden(raw);
    expect(r.flipped).toBe(true);
    expect(r.already).toBe(false);
    expect(r.missing).toBeUndefined();
    expect(r.raw).toBe('---\ntitle: X\nhidden: false\ndate: 2026-09-08\n---\n\ncorpo\n');
  });

  it('flipa CRLF preservando line endings', () => {
    const raw = '---\r\ntitle: X\r\nhidden: true\r\n---\r\n\ncorpo\r\n';
    const r = flipHidden(raw);
    expect(r.flipped).toBe(true);
    expect(r.raw).toContain('hidden: false');
    expect(r.raw).toContain('\r\n');
    expect(r.raw).not.toContain('hidden: true');
  });

  it('already: hidden false → idempotente, bytes intactos', () => {
    const raw = '---\nhidden: false\n---\ncorpo\n';
    const r = flipHidden(raw);
    expect(r.flipped).toBe(false);
    expect(r.already).toBe(true);
    expect(r.raw).toBe(raw);
  });

  it('sem frontmatter → missing', () => {
    expect(flipHidden('sem frontmatter').missing).toBe(true);
  });

  it('frontmatter sem hidden → missing', () => {
    expect(flipHidden('---\ntitle: X\n---\ncorpo\n').missing).toBe(true);
  });
});

describe('removePosts', () => {
  const posts = [
    { path: 'foo.mdx' },
    { path: 'en/foo.mdx' },
    { path: 'en/en-foo.mdx' },
    { path: 'outro.mdx' },
  ];

  it('remove o par PT+EN e preserva os outros', () => {
    const r = removePosts(posts, ['foo.mdx', 'en/foo.mdx']);
    expect(r.map((p) => p.path)).toEqual(['en/en-foo.mdx', 'outro.mdx']);
  });

  it('caminhos ausentes = no-op seguro', () => {
    expect(removePosts(posts, ['nao/existe.mdx'])).toHaveLength(4);
  });
});

describe('twinCandidates (nomenclatura EN inconsistente do repo)', () => {
  it('PT → en/<slug> e en/en-<slug>', () => {
    expect(twinCandidates('foo')).toEqual(['en/foo', 'en/en-foo']);
  });

  it('EN sem prefixo → PT puro', () => {
    expect(twinCandidates('en/foo')).toEqual(['foo']);
  });

  it('EN com prefixo en- → variantes PT', () => {
    expect(twinCandidates('en/en-foo')).toEqual(['en-foo', 'foo']);
  });

  it('dedupe quando variantes colidem', () => {
    expect(twinCandidates('en-foo')).toEqual(['en/en-foo', 'en/en-en-foo']);
  });
});

function stubGhFetch({
  refStatus = 200,
  baseCommitStatus = 200,
  blobStatus = 201,
  treeStatus = 201,
  commitStatus = 201,
  patchStatus = 200,
} = {}) {
  const calls = [];
  const fetchMock = vi.fn(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url: String(url), method, body, headers: opts.headers });
    const mk = (status, data) => ({ status, json: async () => data });
    if (method === 'PATCH' && url.includes('/git/refs/heads/')) return mk(patchStatus, {});
    if (method === 'GET' && url.includes('/git/ref/heads/')) return mk(refStatus, { object: { sha: 'refsha' } });
    if (method === 'GET' && url.includes('/git/commits/')) return mk(baseCommitStatus, { tree: { sha: 'basesha' } });
    if (method === 'POST' && url.includes('/git/blobs')) return mk(blobStatus, { sha: 'blobsha' });
    if (method === 'POST' && url.includes('/git/trees')) return mk(treeStatus, { sha: 'newtree' });
    if (method === 'POST' && url.includes('/git/commits')) return mk(commitStatus, { sha: 'commitsha' });
    if (method === 'GET' && url.includes('/contents/')) {
      const m = String(url).match(/\/contents\/(.+?)(?:\?|$)/);
      const path = decodeURIComponent(m[1]);
      if (path === 'boom.mdx') return mk(500, {});
      if (path === 'src/content/posts/foo.mdx') return mk(200, { sha: 'sha123', content: Buffer.from('conteudo foo').toString('base64') });
      return mk(404, {});
    }
    return mk(500, {});
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

describe('createGithubCommitter (Git Data API)', () => {
  it('getFile: 200 decodifica base64 e leva o header Bearer', async () => {
    const { calls } = stubGhFetch();
    const c = createGithubCommitter({ token: 'tok', owner: 'me', repo: 'r' });
    const r = await c.getFile('src/content/posts/foo.mdx');
    expect(r).toEqual({ present: true, sha: 'sha123', content: 'conteudo foo' });
    expect(calls[0].headers.Authorization).toBe('Bearer tok');
    expect(calls[0].headers.Accept).toBe('application/vnd.github+json');
    expect(calls[0].url).toContain('https://api.github.com/repos/me/r/contents/');
  });

  it('getFile: 404 = present false, sem throw', async () => {
    stubGhFetch();
    const c = createGithubCommitter({ token: 'tok', owner: 'me', repo: 'r' });
    expect(await c.getFile('nao-existe.mdx')).toEqual({ present: false });
  });

  it('getFile: status inesperado lança com status anexado', async () => {
    stubGhFetch();
    const c = createGithubCommitter({ token: 'tok', owner: 'me', repo: 'r' });
    await expect(c.getFile('boom.mdx')).rejects.toMatchObject({ status: 500, message: 'contents boom.mdx HTTP 500' });
  });

  it('commitFiles: sequência ref → commit → blobs → tree → commit → PATCH num único commit', async () => {
    const { calls } = stubGhFetch();
    const c = createGithubCommitter({ token: 'tok', owner: 'me', repo: 'r', branch: 'main' });
    const result = await c.commitFiles({
      message: 'msg',
      files: [
        { path: 'a.mdx', content: 'A' },
        { path: 'b.mdx', content: 'B' },
      ],
    });
    expect(result).toEqual({ commit: 'commitsha', tree: 'newtree', base: 'refsha' });
    expect(calls[0].url).toContain('/git/ref/heads/main');
    expect(calls[1].url).toContain('/git/commits/refsha');
    expect(calls.filter((x) => x.url.includes('/git/blobs')).map((x) => x.body)).toEqual([
      { content: 'A', encoding: 'utf-8' },
      { content: 'B', encoding: 'utf-8' },
    ]);
    const tree = calls.find((x) => x.url.includes('/git/trees')).body;
    expect(tree.base_tree).toBe('basesha');
    expect(tree.tree).toEqual([
      { path: 'a.mdx', mode: '100644', type: 'blob', sha: 'blobsha' },
      { path: 'b.mdx', mode: '100644', type: 'blob', sha: 'blobsha' },
    ]);
    const commit = calls.find((x) => x.method === 'POST' && x.url.includes('/git/commits')).body;
    expect(commit).toEqual({ message: 'msg', tree: 'newtree', parents: ['refsha'] });
    const patch = calls.find((x) => x.method === 'PATCH');
    expect(patch.url).toContain('/git/refs/heads/main');
    expect(patch.body).toEqual({ sha: 'commitsha', force: false });
  });

  it('commitFiles: ref inacessível lança antes de qualquer blob', async () => {
    const { calls } = stubGhFetch({ refStatus: 404 });
    const c = createGithubCommitter({ token: 'tok', owner: 'me', repo: 'r' });
    await expect(c.commitFiles({ message: 'm', files: [{ path: 'a', content: 'A' }] })).rejects.toMatchObject({ status: 404, message: 'ref HTTP 404' });
    expect(calls.filter((x) => x.url.includes('/git/blobs'))).toHaveLength(0);
  });

  it('commitFiles: PATCH 422 marca moved (main andeu — chamador re-busca e refaz)', async () => {
    stubGhFetch({ patchStatus: 422 });
    const c = createGithubCommitter({ token: 'tok', owner: 'me', repo: 'r' });
    await expect(c.commitFiles({ message: 'm', files: [{ path: 'a', content: 'A' }] })).rejects.toMatchObject({ moved: true, status: 422 });
  });

  it('commitFiles: falha de blob/tree/commit lança sem moved (não é corrida)', async () => {
    const c = createGithubCommitter({ token: 'tok', owner: 'me', repo: 'r' });
    stubGhFetch({ blobStatus: 500 });
    await expect(c.commitFiles({ message: 'm', files: [{ path: 'a.mdx', content: 'A' }] })).rejects.toMatchObject({ status: 500, message: 'blob a.mdx HTTP 500' });
    stubGhFetch({ treeStatus: 500 });
    await expect(c.commitFiles({ message: 'm', files: [{ path: 'a.mdx', content: 'A' }] })).rejects.toMatchObject({ status: 500, message: 'create tree HTTP 500' });
    stubGhFetch({ commitStatus: 500 });
    await expect(c.commitFiles({ message: 'm', files: [{ path: 'a.mdx', content: 'A' }] })).rejects.toMatchObject({ status: 500, message: 'commit HTTP 500' });
  });
});

describe('collectHidden (coleta do diretório real de posts)', () => {
  it('é determinística entre chamadas', () => {
    expect(collectHidden()).toEqual(collectHidden());
  });

  it('toda entrada satisfaz as invariantes do painel', () => {
    for (const p of collectHidden()) {
      expect(p.path.endsWith('.mdx')).toBe(true);
      expect(['pt', 'en']).toContain(p.lang);
      expect(p.path).toBe((p.lang === 'en' ? 'en/' : '') + p.slug + '.mdx');
      expect(typeof p.title).toBe('string');
      expect(p.title.length).toBeGreaterThan(0);
      expect(typeof p.date).toBe('string');
      expect(p.content.length).toBeLessThanOrEqual(30000);
      const raw = readFileSync(join(POSTS_DIR, p.path), 'utf-8');
      expect(raw).toContain('hidden:');
    }
  });
});
