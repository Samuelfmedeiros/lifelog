import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler, { twinCandidates } from '../../api/liberar.mjs'

/**
 * api/liberar.mjs — contrato ATUAL (release atomico via Git Data API).
 *
 * A suite anterior testava a versao pre-08/09 (fluxo createBlob/createTree por
 * arquivo). Em 08/09 (`d2efa0c`) o handler passou a usar `releaseAtomic`, que
 * resolve PT+EN+ocultos-data num commit unico, e os testes nunca foram
 * atualizados: 19 falhas permanentes que o gate do Roger acusava como
 * regressao. Reescritos aqui sobre o contrato vigente.
 *
 * O handler le o corpo por STREAM (`req.on('data'|'end')`), nao por req.json();
 * o mock abaixo emite os eventos como o Node real faria.
 */

const mockReq = ({ method = 'POST', auth = 'Bearer test-secret', body = {} } = {}) => {
  const listeners = {}
  const req = {
    method,
    headers: {
      authorization: auth,
      'content-type': 'application/json',
    },
    on: vi.fn((evt, cb) => {
      listeners[evt] = cb
      return req
    }),
    destroy: vi.fn(),
  }
  // entrega o corpo no proximo tick, depois que o handler registra os listeners
  setTimeout(() => {
    if (listeners.data) listeners.data(JSON.stringify(body))
    if (listeners.end) listeners.end()
  }, 0)
  return req
}

const mockRes = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  setHeader: vi.fn(),
})

describe('api/liberar.mjs — autenticacao', () => {
  let originalEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.ADMIN_SECRET = 'test-secret'
    process.env.GH_TOKEN = 'test-token'
    process.env.GH_REPO = 'owner/repo'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('responde 500 quando ADMIN_SECRET nao esta configurado', async () => {
    delete process.env.ADMIN_SECRET
    const res = mockRes()
    await handler(mockReq(), res)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Server misconfiguration' })
    )
  })

  it('responde 401 quando o segredo nao confere', async () => {
    const res = mockRes()
    await handler(mockReq({ auth: 'Bearer wrong-secret' }), res)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Segredo invalido' })
    )
  })

  it('responde 401 quando o header Authorization esta ausente', async () => {
    const res = mockRes()
    await handler(mockReq({ auth: '' }), res)
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('responde 405 quando o metodo nao e POST', async () => {
    const res = mockRes()
    await handler(mockReq({ method: 'GET' }), res)
    expect(res.status).toHaveBeenCalledWith(405)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Metodo nao permitido' })
    )
  })
})

describe('api/liberar.mjs — validacao de slug', () => {
  let originalEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.ADMIN_SECRET = 'test-secret'
    process.env.GH_TOKEN = 'test-token'
    process.env.GH_REPO = 'owner/repo'
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('rejeita corpo sem slug nem path', async () => {
    const res = mockRes()
    await handler(mockReq({ body: {} }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'path/slug invalido' })
    )
  })

  it('rejeita slug com caractere fora do padrao', async () => {
    const res = mockRes()
    await handler(mockReq({ body: { slug: 'Slug Com Espaco!' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'path/slug invalido' })
    )
  })

  it('rejeita path com traversal', async () => {
    const res = mockRes()
    await handler(mockReq({ body: { path: '../../etc/passwd' } }), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })
})

describe('twinCandidates (par PT+EN de um slug)', () => {
  // twinCandidates devolve os CANDIDATOS DO PAR (o "twin"), nunca o proprio base:
  // slug PT -> variantes com prefixo en/; slug en/ -> o base PT sem o prefixo.
  it('slug PT devolve as variantes en/ do par', () => {
    const r = twinCandidates('meu-post')
    expect(r).toContain('en/meu-post')
    expect(r).toContain('en/en-meu-post')
    expect(r).not.toContain('meu-post')
  })

  it('slug en/ devolve o base PT sem prefixo', () => {
    const r = twinCandidates('en/meu-post')
    expect(r).toContain('meu-post')
  })

  it('nomenclatura en/en-slug cobre o base duplo', () => {
    const r = twinCandidates('en/en-meu-post')
    expect(r).toContain('en-meu-post')
  })

  it('preserva subpasta de colecao', () => {
    const r = twinCandidates('en/projeto/meu-post')
    expect(r).toContain('projeto/meu-post')
  })

  it('nunca devolve duplicata', () => {
    const r = twinCandidates('en/en-x')
    expect(new Set(r).size).toBe(r.length)
  })
})

// ─── releaseAtomic (caminho feliz + idempotencia + erros) ───────────────
// Sem estes testes api/liberar.mjs ficava em 40.67% de statements e o gate do
// Roger bloqueava a entrega por cobertura < 50% (medido 14/11).

const STUB_COMMITTER = (over) => ({
  getFile: vi.fn(async (path) => ({ present: true, content: FS[path] ?? '' })),
  commitFiles: vi.fn(async () => ({ commit: 'abc1234' })),
  ...over,
})

let FS = {}

const setFS = (files) => { FS = files }

const mdxOculto = (slug) => `---\ntitle: ${slug}\nhidden: true\n---\ncorpo`
const mdxLiberado = (slug) => `---\ntitle: ${slug}\nhidden: false\n---\ncorpo`
const DATA_OCULTOS = `export default [{"path":"meu-post.mdx"},{"path":"en/meu-post.mdx"},{"path":"outro.mdx"}]`

async function chamaComCommits({ body, fs }) {
  setFS(fs)
  const res = mockRes()
  const commitFiles = vi.fn(async () => ({ commit: 'abc1234' }))
  // injeta o committer trocando o modulo ocultos-core
  vi.doMock('../../scripts/ocultos-core.mjs', () => ({
    flipHidden: (raw) => {
      if (/hidden:\s*false/.test(raw)) return { already: true, raw }
      if (!/hidden:\s*true/.test(raw)) return { missing: true }
      return { flipped: true, raw: raw.replace('hidden: true', 'hidden: false') }
    },
    parseOcultos: (txt) => JSON.parse(txt.replace('export default ', '')),
    serializeOcultos: (posts) => `export default ${JSON.stringify(posts)}`,
    removePosts: (posts, rels) => posts.filter((p) => !rels.includes(p.path)),
    createGithubCommitter: () => ({
      getFile: async (path) => ({ present: true, content: (fs ?? {})[path] ?? '' }),
      commitFiles,
    }),
  }))
  vi.resetModules()
  const { default: freshHandler } = await import('../../api/liberar.mjs')
  await freshHandler(mockReq({ body }), res)
  return { res, commitFiles }
}

describe('releaseAtomic — caminho feliz', () => {
  let originalEnv
  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.ADMIN_SECRET = 'test-secret'
    process.env.GH_TOKEN = 'test-token'
    process.env.GH_REPO = 'owner/repo'
  })
  afterEach(() => { process.env = originalEnv; vi.doUnmock('../../scripts/ocultos-core.mjs') })

  it('libera PT+EN e o data num commit unico', async () => {
    const { res, commitFiles } = await chamaComCommits({
      body: { slug: 'meu-post' },
      fs: {
        'src/content/posts/meu-post.mdx': mdxOculto('meu-post'),
        'src/content/posts/en/meu-post.mdx': mdxOculto('en-meu-post'),
        'api/ocultos-data.mjs': DATA_OCULTOS,
      },
    })
    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.ok).toBe(true)
    expect(payload.released).toContain('meu-post')
    expect(commitFiles).toHaveBeenCalledTimes(1)
    // um unico commit carregando os 2 mdx + o data
    const { files } = commitFiles.mock.calls[0][0]
    expect(files.length).toBe(3)
  })

  it('e idempotente quando o par ja esta liberado (200, sem commit)', async () => {
    const { res, commitFiles } = await chamaComCommits({
      body: { slug: 'meu-post' },
      fs: {
        'src/content/posts/meu-post.mdx': mdxLiberado('meu-post'),
        'src/content/posts/en/meu-post.mdx': mdxLiberado('en-meu-post'),
        'api/ocultos-data.mjs': `export default []`,
      },
    })
    const payload = res.json.mock.calls[0][0]
    expect(payload.already.length).toBeGreaterThan(0)
    expect(commitFiles).not.toHaveBeenCalled()
  })

  it('devolve 422 quando nenhum arquivo existe', async () => {
    const { res } = await chamaComCommits({
      body: { slug: 'nao-existe' },
      fs: { 'api/ocultos-data.mjs': `export default []` },
    })
    expect(res.status).toHaveBeenCalledWith(422)
  })
})
