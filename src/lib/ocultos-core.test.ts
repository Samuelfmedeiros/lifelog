import { describe, it, expect } from 'vitest';
import {
  serializeOcultos,
  parseOcultos,
  flipHidden,
  removePosts,
} from '../../scripts/ocultos-core.mjs';
import { twinCandidates } from '../../api/liberar.mjs';

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
