import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import handler, {
  SLUG_RE,
  MAX_NOTA,
  secretOk,
  sanitizeNota,
  slugFromPath,
  checkRate,
} from '../../api/recusar.mjs';

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  process.env.ADMIN_SECRET = 'segredo-de-teste';
  process.env.GH_TOKEN = 'gh-token-de-teste';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
});

function makeReq(body, { method = 'POST', headers = {}, ip = '10.0.0.1' } = {}) {
  const payload = JSON.stringify(body ?? {});
  let emitted = false;
  const req = {
    method,
    headers,
    socket: { remoteAddress: ip },
    on(ev, cb) {
      if (ev === 'data' && !emitted) {
        emitted = true;
        cb(payload);
      }
      if (ev === 'end') cb();
      return req;
    },
  };
  return req;
}

function makeRes() {
  const res = {
    _status: 0,
    _json: null,
    _headers: {},
    status(c) {
      this._status = c;
      return this;
    },
    json(o) {
      this._json = o;
    },
    setHeader(k, v) {
      this._headers[k] = v;
    },
    end() {},
  };
  return res;
}

function stubGitHub({ issue = 201, file = 201, get = 404 } = {}) {
  const fetchMock = vi.fn((url, opts) => {
    const method = opts?.method || 'GET';
    if (url.includes('/issues') && method === 'POST') {
      return Promise.resolve({
        status: issue,
        json: () => Promise.resolve({ html_url: 'https://github.com/x/y/issues/1', number: 1 }),
      });
    }
    if (url.includes('/contents/') && method === 'PUT') {
      return Promise.resolve({ status: file, json: () => Promise.resolve({ commit: { sha: 'abc123' } }) });
    }
    if (url.includes('/contents/') && method === 'GET') {
      return Promise.resolve({ status: get, json: () => Promise.resolve({}) });
    }
    return Promise.resolve({ status: 500, json: () => Promise.resolve({}) });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('sanitizeNota — sanitização da nota de recusa', () => {
  it('escapa HTML básico', () => {
    expect(sanitizeNota('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapa & antes de < e >', () => {
    expect(sanitizeNota('a & b <c>')).toBe('a &amp; b &lt;c&gt;');
  });

  it('remove bloco frontmatter (previne injeção de hidden:false)', () => {
    const nota = 'ok\n---\nhidden: false\n---\ncontinua';
    expect(sanitizeNota(nota)).not.toContain('hidden: false');
    expect(sanitizeNota(nota)).toContain('[frontmatter removido]');
  });

  it('remove caracteres de controle, mantendo \\n', () => {
    const out = sanitizeNota('linha1\x00\x01\x08linha2\nlinha3');
    expect(out).toBe('linha1linha2\nlinha3');
  });

  it('limita a nota ao tamanho máximo', () => {
    const long = 'x'.repeat(MAX_NOTA + 500);
    const out = sanitizeNota(long);
    expect(out.length).toBe(MAX_NOTA);
  });

  it('faz trim do texto', () => {
    expect(sanitizeNota('   nota com espacos  ')).toBe('nota com espacos');
  });

  it('converte não-string em string vazia', () => {
    expect(sanitizeNota(undefined)).toBe('');
    expect(sanitizeNota(null)).toBe('');
  });
});

describe('slugFromPath — extração de slug', () => {
  it('slug puro sem extensão', () => {
    expect(slugFromPath('capivara-o-painel')).toBe('capivara-o-painel');
  });

  it('remove extensão .mdx', () => {
    expect(slugFromPath('capivara-o-painel.mdx')).toBe('capivara-o-painel');
  });

  it('remove extensão .md', () => {
    expect(slugFromPath('capivara-o-painel.md')).toBe('capivara-o-painel');
  });

  it('preserva prefixo en/ (par bilíngue)', () => {
    expect(slugFromPath('en/capivara-o-painel.mdx')).toBe('en/capivara-o-painel');
  });

  it('remove prefixo src/content/posts/', () => {
    expect(slugFromPath('src/content/posts/capivara-o-painel.mdx')).toBe('capivara-o-painel');
    expect(slugFromPath('src/content/posts/en/capivara-o-painel.mdx')).toBe('en/capivara-o-painel');
  });

  it('remove prefixo posts/', () => {
    expect(slugFromPath('posts/capivara-o-painel.mdx')).toBe('capivara-o-painel');
  });

  it('retorna string vazia para input vazio', () => {
    expect(slugFromPath('')).toBe('');
    expect(slugFromPath(undefined)).toBe('');
    expect(slugFromPath(null)).toBe('');
  });
});

describe('SLUG_RE — validação de slug', () => {
  it('aceita slugs válidos', () => {
    for (const s of ['capivara-o-painel', 'en/capivara-o-painel', 'a', 'x-1-2']) {
      expect(slugFromPath(s) && SLUG_RE.test(slugFromPath(s))).toBe(true);
    }
  });

  it('rejeita slugs inválidos (traversal, espaço, caracteres especiais)', () => {
    for (const s of ['../foo', 'foo/../../x', 'foo bar', 'foo_bar', 'Foo', 'foo.bar', 'foo@bar', 'foo?bar']) {
      expect(SLUG_RE.test(s), `deveria rejeitar: ${s}`).toBe(false);
    }
  });
});

describe('secretOk — autenticação por Bearer', () => {
  it('aceita segredo correto', () => {
    const r = secretOk(makeReq({}, { headers: { authorization: 'Bearer segredo-de-teste' } }));
    expect(r.ok).toBe(true);
  });

  it('aceita Bearer sem espaço extra e case-insensitive', () => {
    expect(secretOk(makeReq({}, { headers: { authorization: 'bearer segredo-de-teste' } })).ok).toBe(true);
    expect(secretOk(makeReq({}, { headers: { authorization: 'Bearer  segredo-de-teste' } })).ok).toBe(true);
  });

  it('rejeita segredo errado', () => {
    const r = secretOk(makeReq({}, { headers: { authorization: 'Bearer errado' } }));
    expect(r.ok).toBe(false);
  });

  it('rejeita quando ADMIN_SECRET não está configurado', () => {
    delete process.env.ADMIN_SECRET;
    const r = secretOk(makeReq({}, { headers: { authorization: 'Bearer qualquer' } }));
    expect(r.ok).toBe(false);
    expect(r.error).toContain('ADMIN_SECRET');
  });

  it('rejeita quando não há header de autorização', () => {
    const r = secretOk(makeReq({}));
    expect(r.ok).toBe(false);
  });
});

describe('checkRate — rate limit 3/30s', () => {
  it('permite até 3 requisições na janela', () => {
    expect(checkRate('ip-ok')).toBe(true);
    expect(checkRate('ip-ok')).toBe(true);
    expect(checkRate('ip-ok')).toBe(true);
  });

  it('bloqueia a 4ª requisição na mesma janela', () => {
    checkRate('ip-block');
    checkRate('ip-block');
    checkRate('ip-block');
    expect(checkRate('ip-block')).toBe(false);
  });
});

describe('handler — POST /api/recusar', () => {
  it('OPTIONS responde 204 (CORS preflight)', async () => {
    const res = makeRes();
    await handler(makeReq({}, { method: 'OPTIONS' }), res);
    expect(res._status).toBe(204);
  });

  it('401 sem segredo válido', async () => {
    const res = makeRes();
    await handler(makeReq({ path: 'foo', nota: 'n' }, { ip: '10.1.0.1' }), res);
    expect(res._status).toBe(401);
  });

  it('401 com segredo errado', async () => {
    const res = makeRes();
    await handler(
      makeReq({ path: 'foo', nota: 'n' }, { headers: { authorization: 'Bearer errado' }, ip: '10.1.0.2' }),
      res,
    );
    expect(res._status).toBe(401);
  });

  it('400 para path/slug inválido', async () => {
    const res = makeRes();
    await handler(
      makeReq(
        { path: '../../etc/passwd', nota: 'n' },
        { headers: { authorization: 'Bearer segredo-de-teste' }, ip: '10.1.0.3' },
      ),
      res,
    );
    expect(res._status).toBe(400);
  });

  it('400 para nota vazia', async () => {
    const res = makeRes();
    await handler(
      makeReq(
        { path: 'capivara-o-painel', nota: '   ' },
        { headers: { authorization: 'Bearer segredo-de-teste' }, ip: '10.1.0.4' },
      ),
      res,
    );
    expect(res._status).toBe(400);
  });

  it('200 no caminho feliz com fetch mockado (issue + arquivo)', async () => {
    stubGitHub();
    const res = makeRes();
    await handler(
      makeReq(
        { path: 'capivara-o-painel', nota: 'tira as referencias do leve lavanda' },
        { headers: { authorization: 'Bearer segredo-de-teste' }, ip: '10.1.0.5' },
      ),
      res,
    );
    expect(res._status).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(res._json.slug).toBe('capivara-o-painel');
    expect(res._json.issue.ok).toBe(true);
    expect(res._json.file.ok).toBe(true);
    expect(res._json.errors).toBeUndefined();
  });

  it('200 mesmo se a GitHub API falhar (nota registrada mesmo assim)', async () => {
    stubGitHub({ issue: 500, file: 500 });
    const res = makeRes();
    await handler(
      makeReq(
        { path: 'capivara-o-painel', nota: 'algo' },
        { headers: { authorization: 'Bearer segredo-de-teste' }, ip: '10.1.0.6' },
      ),
      res,
    );
    expect(res._status).toBe(200);
    expect(res._json.ok).toBe(true);
    expect(Array.isArray(res._json.errors)).toBe(true);
    expect(res._json.errors.length).toBe(2);
  });

  it('429 ao estourar o rate limit no mesmo IP', async () => {
    stubGitHub();
    const authed = { headers: { authorization: 'Bearer segredo-de-teste' }, ip: '9.9.9.9' };
    for (let i = 0; i < 3; i++) {
      const res = makeRes();
      await handler(makeReq({ path: 'slug', nota: 'n' }, authed), res);
      expect(res._status).toBe(200);
    }
    const res4 = makeRes();
    await handler(makeReq({ path: 'slug', nota: 'n' }, authed), res4);
    expect(res4._status).toBe(429);
  });
});
