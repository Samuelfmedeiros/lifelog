import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler from '../../api/liberar.mjs';
import { serializeOcultos, parseOcultos } from '../../scripts/ocultos-core.mjs';

const SECRET = 'segredo-de-teste';
const ORIG_ENV = { ...process.env };

function makeReq(payload, { method = 'POST', headers = {} } = {}) {
  const req = {
    method,
    headers: { authorization: `Bearer ${SECRET}`, ...headers },
    on(ev, cb) {
      if (ev === 'data') cb(payload === undefined ? '' : JSON.stringify(payload));
      if (ev === 'end') cb();
      return req;
    },
    destroy() {},
  };
  return req;
}

function makeRes() {
  const res = {
    _status: 0,
    _json: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(payload) {
      this._json = payload;
      return this;
    },
  };
  return res;
}

function stubGithubDataApi({ files = {}, patchStatus = 200, blobStatus = 201 } = {}) {
  const calls = [];
  const fetchMock = vi.fn(async (url, opts = {}) => {
    const method = opts.method || 'GET';
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url: String(url), method, body });
    const mk = (status, data) => ({ status, json: async () => data });
    if (method === 'PATCH' && url.includes('/git/refs/heads/')) return mk(patchStatus, {});
    if (method === 'GET' && url.includes('/git/ref/heads/')) return mk(200, { object: { sha: 'refsha' } });
    if (method === 'GET' && url.includes('/git/commits/')) return mk(200, { tree: { sha: 'basesha' } });
    if (method === 'POST' && url.includes('/git/blobs')) return mk(blobStatus, { sha: 'blobsha' });
    if (method === 'POST' && url.includes('/git/trees')) return mk(201, { sha: 'newtree' });
    if (method === 'POST' && url.includes('/git/commits')) return mk(201, { sha: 'commitsha' });
    if (method === 'GET' && url.includes('/contents/')) {
      const m = String(url).match(/\/contents\/(.+?)(?:\?|$)/);
      const path = decodeURIComponent(m[1]);
      const content = files[path];
      if (content === undefined) return mk(404, {});
      return mk(200, { content: Buffer.from(content, 'utf-8').toString('base64') });
    }
    return mk(500, {});
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, calls };
}

const mdx = (hidden) =>
  `---\ntitle: Foo Bar\nproject: lifelog\npubDate: 2026-10-01\nhidden: ${hidden}\n---\n\ncorpo do post\n`;

const entry = (path, extra = {}) => ({
  path,
  slug: path.replace(/\.mdx$/, '').replace(/^en\//, ''),
  lang: path.startsWith('en/') ? 'en' : 'pt',
  title: 'Foo Bar',
  date: '2026-10-01',
  project: 'lifelog',
  content: 'x',
  ...extra,
});

beforeEach(() => {
  process.env.ADMIN_SECRET = SECRET;
  process.env.GH_TOKEN = 'gh-token-teste';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
});

describe('POST /api/liberar (release atômico PT+EN + ocultos-data)', () => {
  it('200: flipa PT+EN e regenera ocultos-data num ÚNICO commit', async () => {
    const data = serializeOcultos([entry('foo.mdx'), entry('en/foo.mdx'), entry('outro.mdx')]);
    const { calls } = stubGithubDataApi({
      files: {
        'src/content/posts/foo.mdx': mdx('true'),
        'src/content/posts/en/foo.mdx': mdx('true'),
        'api/ocultos-data.mjs': data,
      },
    });
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }), res);
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({
      ok: true,
      released: ['foo', 'en/foo'],
      already: [],
      missing: ['en/en-foo'],
      mode: 'atomic',
      commit: 'commitsha',
      dataSynced: true,
    });
    const commit = calls.find((c) => c.method === 'POST' && c.url.includes('/git/commits'));
    expect(commit.body.message).toBe('release(post): foo (PT+EN + ocultos-data)');
    const tree = calls.find((c) => c.url.includes('/git/trees'));
    expect(tree.body.base_tree).toBe('basesha');
    // Git Data API usa paths relativos à RAIZ do repo — src/content/posts/...
    expect(tree.body.tree.map((e) => e.path).sort()).toEqual(['api/ocultos-data.mjs', 'src/content/posts/en/foo.mdx', 'src/content/posts/foo.mdx'].sort());
    const blobs = calls.filter((c) => c.method === 'POST' && c.url.includes('/git/blobs')).map((c) => c.body.content);
    expect(blobs.some((b) => b.includes('hidden: false'))).toBe(true);
    const dataBlob = blobs.find((b) => b.includes('export default'));
    expect(parseOcultos(dataBlob).map((p) => p.path)).toEqual(['outro.mdx']);
  });

  it('200: aceita path completo (src/content/posts/slug.mdx) e post PT-only', async () => {
    const { calls } = stubGithubDataApi({
      files: { 'src/content/posts/foo.mdx': mdx('true') },
    });
    const res = makeRes();
    await handler(makeReq({ path: 'src/content/posts/foo.mdx' }), res);
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({
      ok: true,
      released: ['foo'],
      missing: ['en/foo', 'en/en-foo'],
      commit: 'commitsha',
      dataSynced: false,
    });
    const tree = calls.find((c) => c.url.includes('/git/trees'));
    expect(tree.body.tree.map((e) => e.path)).toEqual(['src/content/posts/foo.mdx']);
  });

  it('200 + stale cure: par já liberado mas entrada órfã no data sai em commit de sync', async () => {
    const data = serializeOcultos([entry('foo.mdx'), entry('en/foo.mdx'), entry('outro.mdx')]);
    const { calls } = stubGithubDataApi({
      files: {
        'src/content/posts/foo.mdx': mdx('false'),
        'src/content/posts/en/foo.mdx': mdx('false'),
        'api/ocultos-data.mjs': data,
      },
    });
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }), res);
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({
      ok: true,
      released: [],
      already: ['foo', 'en/foo'],
      missing: ['en/en-foo'],
      commit: 'commitsha',
      dataSynced: true,
    });
    const commit = calls.find((c) => c.method === 'POST' && c.url.includes('/git/commits'));
    expect(commit.body.message).toBe('chore(ocultos): sync data pós-liberação de foo (stale cure)');
    const tree = calls.find((c) => c.url.includes('/git/trees'));
    expect(tree.body.tree.map((e) => e.path)).toEqual(['api/ocultos-data.mjs']);
  });

  it('200 idempotente: já liberado e data em dia → nenhum commit', async () => {
    const data = serializeOcultos([entry('outro.mdx')]);
    stubGithubDataApi({
      files: {
        'src/content/posts/foo.mdx': mdx('false'),
        'src/content/posts/en/foo.mdx': mdx('false'),
        'api/ocultos-data.mjs': data,
      },
    });
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }), res);
    expect(res._status).toBe(200);
    expect(res._json).toMatchObject({
      ok: true,
      released: [],
      already: ['foo', 'en/foo'],
      missing: ['en/en-foo'],
      commit: null,
      dataSynced: true,
    });
  });

  it('422: nada a liberar (arquivos inexistentes) com lastError vazio', async () => {
    stubGithubDataApi({});
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }), res);
    expect(res._status).toBe(422);
    expect(res._json.error).toBe('Nada foi liberado (todos os arquivos ja estavam liberados ou nao existem)');
    expect(res._json.lastError).toEqual([]);
  });

  it('422: mdx existe mas não está oculto → lastError explica o slug', async () => {
    stubGithubDataApi({
      files: { 'src/content/posts/foo.mdx': '---\ntitle: Foo\n---\n\ncorpo\n' },
    });
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }), res);
    expect(res._status).toBe(422);
    expect(res._json.lastError).toEqual([
      { slug: 'foo', error: 'Post nao esta oculto (hidden nao e true)' },
    ]);
  });

  it('502: PATCH sempre 422 → 3 tentativas re-buscando conteúdo fresco', async () => {
    const data = serializeOcultos([entry('foo.mdx')]);
    const { calls } = stubGithubDataApi({
      patchStatus: 422,
      files: {
        'src/content/posts/foo.mdx': mdx('true'),
        'api/ocultos-data.mjs': data,
      },
    });
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }), res);
    expect(res._status).toBe(502);
    expect(res._json.error).toBe('Falha apos 3 tentativas (main mudando durante release)');
    expect(res._json.lastError).toHaveLength(3);
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(3);
    // 3 tentativas × (3 GETs de mdx: foo, en/foo, en/en-foo + 1 GET do ocultos-data) = 12
    expect(calls.filter((c) => c.method === 'GET' && c.url.includes('/contents/'))).toHaveLength(12);
  });

  it('502: falha não-moved (blob 500) não entra no loop de retry', async () => {
    stubGithubDataApi({
      blobStatus: 500,
      files: { 'src/content/posts/foo.mdx': mdx('true') },
    });
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }), res);
    expect(res._status).toBe(502);
    expect(res._json.error).toBe('Falha na liberacao: blob src/content/posts/foo.mdx HTTP 500');
  });
});

describe('POST /api/liberar (validação de entrada)', () => {
  it('500: sem GH_TOKEN configurado', async () => {
    delete process.env.GH_TOKEN;
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }), res);
    expect(res._status).toBe(500);
    expect(res._json.error).toContain('GH_TOKEN nao configurado');
  });

  it('401: segredo inválido', async () => {
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }, { headers: { authorization: 'Bearer errado' } }), res);
    expect(res._status).toBe(401);
    expect(res._json.error).toBe('Segredo invalido');
  });

  it('401: ADMIN_SECRET ausente no ambiente', async () => {
    delete process.env.ADMIN_SECRET;
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }), res);
    expect(res._status).toBe(401);
    expect(res._json.error).toBe('ADMIN_SECRET nao configurado (env da Vercel)');
  });

  it('405: método não-POST', async () => {
    const res = makeRes();
    await handler(makeReq({ slug: 'foo' }, { method: 'GET' }), res);
    expect(res._status).toBe(405);
    expect(res._json.error).toBe('Metodo nao permitido');
  });

  it('400: slug com travessal de path', async () => {
    const res = makeRes();
    await handler(makeReq({ slug: '../etc/passwd' }), res);
    expect(res._status).toBe(400);
    expect(res._json.error).toBe('path/slug invalido');
  });

  it('400: slug vazio/inválido (maiúsculas não passam)', async () => {
    const res = makeRes();
    await handler(makeReq({ slug: 'Foo_Bar' }), res);
    expect(res._status).toBe(400);
    const res2 = makeRes();
    await handler(makeReq({}), res2);
    expect(res2._status).toBe(400);
  });

  it('400: body gigante destrói o request e JSON inválido vira body vazio', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${SECRET}` },
      _destroyed: false,
      on(ev, cb) {
        if (ev === 'data') cb('x'.repeat(1000001));
        if (ev === 'end') cb();
        return req;
      },
      destroy() {
        this._destroyed = true;
      },
    };
    const res = makeRes();
    await handler(req, res);
    expect(req._destroyed).toBe(true);
    expect(res._status).toBe(400);
    expect(res._json.error).toBe('path/slug invalido');
  });
});
