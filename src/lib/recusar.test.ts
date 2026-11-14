import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { secretOk, sanitizeNota, slugFromPath, checkRate, MAX_NOTA } from '../../api/recusar.mjs'

/**
 * api/recusar.mjs — contrato ATUAL.
 *
 * A suite anterior importava `createGitHubIssue`, `commitRecusaFile` e
 * `notifyTelegram`: funcoes que o handler nao exporta mais (o fluxo de issue/
 * commit foi substituido pelo release atomico). Tambem esperava sanitizacao
 * com entidades HTML escapadas e corte em 500 chars — o contrato vigente usa
 * `MAX_NOTA` (2000). Reescrita sobre as funcoes realmente exportadas.
 */

describe('secretOk', () => {
  let originalEnv

  beforeEach(() => { originalEnv = { ...process.env }; })
  afterEach(() => { process.env = originalEnv })

  it('falha quando ADMIN_SECRET nao esta configurado', () => {
    delete process.env.ADMIN_SECRET
    const r = secretOk({ headers: {} })
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/ADMIN_SECRET nao configurado/)
  })

  it('falha sem header Authorization', () => {
    process.env.ADMIN_SECRET = 'segredo'
    const r = secretOk({ headers: {} })
    expect(r.ok).toBe(false)
    expect(r.error).toBe('Segredo invalido')
  })

  it('aceita o segredo correto com prefixo Bearer', () => {
    process.env.ADMIN_SECRET = 'segredo'
    const r = secretOk({ headers: { authorization: 'Bearer segredo' } })
    expect(r.ok).toBe(true)
  })

  it('rejeita segredo errado', () => {
    process.env.ADMIN_SECRET = 'segredo'
    const r = secretOk({ headers: { authorization: 'Bearer outro' } })
    expect(r.ok).toBe(false)
  })

  it('rejeita segredo de tamanho diferente sem estourar', () => {
    process.env.ADMIN_SECRET = 'segredo-longo'
    const r = secretOk({ headers: { authorization: 'Bearer x' } })
    expect(r.ok).toBe(false)
  })
})

describe('sanitizeNota', () => {
  it('escapa HTML', () => {
    const r = sanitizeNota('<script>alert(1)</script>')
    expect(r).not.toContain('<script>')
    expect(r).toContain('&lt;script&gt;')
  })

  it('remove bloco de frontmatter (previne injecao de hidden:false)', () => {
    const r = sanitizeNota('---\nhidden: false\n---\nnota real')
    expect(r).not.toContain('hidden: false')
    expect(r).toContain('[frontmatter removido]')
  })

  it('respeita o teto MAX_NOTA', () => {
    const r = sanitizeNota('a'.repeat(MAX_NOTA + 500))
    expect(r.length).toBeLessThanOrEqual(MAX_NOTA)
  })

  it('remove caracteres de controle mas preserva quebra de linha', () => {
    const r = sanitizeNota('linha1\x00\nlinha2')
    expect(r).toContain('\n')
    expect(r).not.toContain('\x00')
  })

  it('trata entrada vazia sem estourar', () => {
    expect(sanitizeNota('')).toBe('')
    expect(sanitizeNota(undefined)).toBe('')
  })
})

describe('slugFromPath', () => {
  it('remove prefixo de colecao e extensao', () => {
    expect(slugFromPath('src/content/posts/meu-post.mdx')).toBe('meu-post')
  })

  it('preserva subpasta de colecao', () => {
    expect(slugFromPath('src/content/posts/en/meu-post.mdx')).toBe('en/meu-post')
  })

  it('devolve vazio para entrada vazia', () => {
    expect(slugFromPath('')).toBe('')
    expect(slugFromPath(null)).toBe('')
  })
})

describe('checkRate', () => {
  it('permite dentro do limite e bloqueia acima', () => {
    const ip = `10.0.0.${Math.floor(Math.random() * 250)}`
    const resultados = []
    for (let i = 0; i < 40; i++) resultados.push(checkRate(ip))
    expect(resultados.some((r) => r === true)).toBe(true)
    expect(resultados[resultados.length - 1]).toBe(false)
  })
})

// ─── handler completo (as 3 vias de persistencia sao mockadas) ──────────
// Sem estes testes recusar.mjs ficava em 29.5% e o gate bloqueava por
// cobertura < 50% (medido 14/11).

const mockReqRec = ({ method = 'POST', auth = 'Bearer admin-secret', body = {}, ip = '10.0.0.9' } = {}) => {
  const listeners = {}
  const req = {
    method,
    headers: { authorization: auth, 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
    on: vi.fn((evt, cb) => { listeners[evt] = cb; return req }),
    destroy: vi.fn(),
  }
  setTimeout(() => {
    if (listeners.data) listeners.data(JSON.stringify(body))
    if (listeners.end) listeners.end()
  }, 0)
  return req
}

const mockResRec = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  setHeader: vi.fn(),
  end: vi.fn(),
})

async function rodarHandler({ reqArgs = {}, issueOk = true, fileOk = true } = {}) {
  process.env.ADMIN_SECRET = 'admin-secret'
  process.env.GITHUB_TOKEN = 'test-token'
  process.env.GITHUB_REPO = 'owner/repo'
  vi.resetModules()
  vi.doMock('../../api/recusar.mjs', async () => {
    const real = await vi.importActual('../../api/recusar.mjs')
    return {
      ...real,
      default: real.default,
    }
  })
  const mod = await import('../../api/recusar.mjs')
  const res = mockResRec()
  // as vias fazem fetch/rede: stub global para nao sair da maquina
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    const u = String(url)
    if (u.includes('/issues')) {
      return issueOk
        ? { ok: true, status: 201, json: async () => ({ number: 7, html_url: 'https://github.com/o/r/issues/7' }) }
        : { ok: false, status: 500, json: async () => ({}) }
    }
    return fileOk
      ? { ok: true, status: 200, json: async () => ({}) }
      : { ok: false, status: 500, json: async () => ({}) }
  })
  await mod.default(mockReqRec(reqArgs), res)
  fetchSpy.mockRestore()
  return res
}

describe('handler — respostas de borda', () => {
  let originalEnv
  beforeEach(() => { originalEnv = { ...process.env } })
  afterEach(() => { process.env = originalEnv; vi.doUnmock('../../api/recusar.mjs') })

  it('responde 204 em OPTIONS (preflight CORS)', async () => {
    const res = await rodarHandler({ reqArgs: { method: 'OPTIONS' } })
    expect(res.status).toHaveBeenCalledWith(204)
  })

  it('responde 401 sem segredo valido', async () => {
    const res = await rodarHandler({ reqArgs: { auth: 'Bearer errado' } })
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('responde 405 em metodo diferente de POST', async () => {
    const res = await rodarHandler({ reqArgs: { method: 'GET' } })
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('responde 400 sem slug', async () => {
    const res = await rodarHandler({ reqArgs: { body: { nota: 'x' } } })
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 400 com nota vazia', async () => {
    const res = await rodarHandler({ reqArgs: { body: { slug: 'meu-post', nota: '   ' } } })
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('responde 429 quando estoura o rate limit do IP', async () => {
    // rateMap vive no modulo: precisa do MESMO modulo entre as chamadas
    // (rodarHandler faz vi.resetModules() e zeraria o contador a cada request)
    process.env.ADMIN_SECRET = 'admin-secret'
    vi.resetModules()
    const mod = await import('../../api/recusar.mjs')
    const ip = `192.168.9.${Math.floor(Math.random() * 200)}`
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => ({
      ok: true, status: 201,
      json: async () => ({ number: 1, html_url: 'https://github.com/o/r/issues/1' }),
    }))
    let res
    for (let i = 0; i < 40; i++) {
      res = mockResRec()
      await mod.default(mockReqRec({ body: { slug: 'x-post', nota: 'n' }, ip }), res)
    }
    fetchSpy.mockRestore()
    expect(res.status).toHaveBeenCalledWith(429)
  })

  it('registra a recusa com sucesso (200) quando as vias respondem', async () => {
    const res = await rodarHandler({
      reqArgs: { body: { slug: 'meu-post', nota: 'post ruim' }, ip: `172.16.${Math.floor(Math.random() * 200)}.5` },
    })
    expect(res.status).toHaveBeenCalledWith(200)
    const payload = res.json.mock.calls[0][0]
    expect(payload.ok).toBe(true)
    expect(payload.slug).toBe('meu-post')
  })
})
