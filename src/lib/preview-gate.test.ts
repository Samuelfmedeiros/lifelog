import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  existsSync,
  readFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

// Raiz do repo a partir deste arquivo (src/lib -> raiz).
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NODE = process.execPath;

/** Fixture isolado: copia api/ e roda o script com cwd la dentro, sem sujar o repo. */
function fixture(comDist = false, comDados = true) {
  const dir = mkdtempSync(join(tmpdir(), 'preview-gate-'));
  mkdirSync(join(dir, 'api'), { recursive: true });
  mkdirSync(join(dir, 'scripts'), { recursive: true });
  cpSync(join(RAIZ, 'api', 'preview.mjs'), join(dir, 'api', 'preview.mjs'));
  cpSync(join(RAIZ, 'api', 'session.mjs'), join(dir, 'api', 'session.mjs'));
  if (comDados) {
    writeFileSync(join(dir, 'api', 'preview-data.mjs'), '// fixture\nexport default {};\n', 'utf8');
  }
  if (comDist) {
    const pag = join(dir, 'dist', 'ocultos', 'preview', 'pt', 'post-falso');
    mkdirSync(pag, { recursive: true });
    writeFileSync(join(pag, 'index.html'), '<html data-project="x">conteudo</html>', 'utf8');
  }
  return dir;
}

function rodar(dir: string, script: string) {
  const r = spawnSync(NODE, [join(RAIZ, 'scripts', script)], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  });
  return { rc: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const criados: string[] = [];
afterAll(() => {
  for (const d of criados) rmSync(d, { recursive: true, force: true });
});
function novo(...args: Parameters<typeof fixture>) {
  const d = fixture(...args);
  criados.push(d);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// gen-preview-data.mjs
//
// REGRESSAO 01/11/2026: com zero post oculto o script fazia `process.exit(1)`
// e o build quebrava (CI vermelho em 3 pushes seguidos). Zero preview é estado
// legitimo — o painel /ocultos pode estar vazio. O que NÃO pode é sobrar HTML
// estatico em dist/: a Vercel serviria o arquivo antes do rewrite e o post
// oculto voltaria a ser publico.
// ─────────────────────────────────────────────────────────────────────────────
describe('gen-preview-data.mjs', () => {
  it('zero post oculto NAO quebra o build (exit 0 + aviso)', () => {
    const dir = novo(false);
    const { rc, out } = rodar(dir, 'gen-preview-data.mjs');

    expect(rc, out).toBe(0);
    expect(out.toLowerCase()).toContain('nenhum post oculto');
    // bundle vazio gerado, nao ausente
    const dados = readFileSync(join(dir, 'api', 'preview-data.mjs'), 'utf8');
    expect(dados).toContain('export default {}');
  });

  it('com post oculto: empacota o HTML e remove o dist/', () => {
    const dir = novo(true);
    const { rc, out } = rodar(dir, 'gen-preview-data.mjs');

    expect(rc, out).toBe(0);
    expect(out).toContain('1 preview(s) protegido(s)');
    // trava dura que NAO afrouxa
    expect(existsSync(join(dir, 'dist', 'ocultos', 'preview'))).toBe(false);
    // e o HTML foi para o bundle servido so com cookie
    const dados = readFileSync(join(dir, 'api', 'preview-data.mjs'), 'utf8');
    expect(dados).toContain('data-project');
    expect(dados).not.toContain('Gerado automaticamente');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// check-preview-gate.mjs
//
// REGRESSAO 01/11/2026: com o mapa vazio o script fazia
// `Object.keys(mapa)[0].split('/')` e morria com TypeError — o CI ficava
// vermelho por um erro do PRÓPRIO gate, nao do conteudo. O que nao depende de
// post (sessao, cookie, 404, dist) continua sendo cobrado.
// ─────────────────────────────────────────────────────────────────────────────
describe('check-preview-gate.mjs', () => {
  it('mapa vazio: APTO com SKIP explicito (nao TypeError)', () => {
    const dir = novo(false, true);
    const { rc, out } = rodar(dir, 'check-preview-gate.mjs');

    expect(rc, out).toBe(0);
    expect(out).toContain('APTO');
    // o gate nao pode passar em silencio: diz o que pulou
    expect(out).toMatch(/SKIP/);
    // e o que nao depende de post continua sendo medido
    expect(out).toContain('session com segredo errado = 401');
    expect(out).toContain('preview sem cookie = 307');
    expect(out).toContain('slug inexistente com cookie = 404');
    expect(out).toContain('dist/ocultos/preview nao existe no build');
  });

  it('sem api/preview-data.mjs: falha dura (nao inventa slug)', () => {
    const dir = novo(false, false);
    const { rc, out } = rodar(dir, 'check-preview-gate.mjs');

    expect(rc, out).toBe(1);
    expect(out).toContain('preview-data.mjs nao existe');
    expect(out).not.toContain('TypeError');
  });

  it('HTML estatico sobrando em dist/: REPROVADO', () => {
    const dir = novo(true, true);
    const { rc, out } = rodar(dir, 'check-preview-gate.mjs');

    expect(out).toContain('FALHA');
    expect(out).toContain('dist/ocultos/preview nao existe no build');
    expect(rc, out).toBe(1);
  });
});
