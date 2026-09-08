import { describe, it, expect } from 'vitest';
import { TAG_VOCAB, TAG_ALIASES, CANONICAL_SLUGS, canonicalizeTag, tagLabel } from './tag-vocab';

describe('tag-vocab', () => {
  it('vocab nao tem slugs duplicados', () => {
    const slugs = TAG_VOCAB.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('aliases apontam para slugs canonicos (e nenhum alias e canonico)', () => {
    for (const [from, to] of Object.entries(TAG_ALIASES)) {
      expect(CANONICAL_SLUGS.has(to), `alias ${from} -> ${to} nao-canonico`).toBe(true);
      expect(CANONICAL_SLUGS.has(from), `${from} e alias E canonico`).toBe(false);
    }
  });

  it('canonicalizeTag aplica alias e e idempotente', () => {
    for (const from of Object.keys(TAG_ALIASES)) {
      const c = canonicalizeTag(from);
      expect(CANONICAL_SLUGS.has(c), `${from} -> ${c} nao e canonico`).toBe(true);
      expect(canonicalizeTag(c)).toBe(c);
    }
  });

  it('canonicalizeTag normaliza case/underscore/spacing', () => {
    expect(canonicalizeTag('  CI_CD  ')).toBe('ci-cd');
    expect(canonicalizeTag('LLM')).toBe('llm');
    expect(canonicalizeTag('Coding Agent')).toBe('coding-agent');
  });

  it('tagLabel PT cai no slug quando nao ha label', () => {
    const bare = TAG_VOCAB.find((t) => !t.pt);
    const labeled = TAG_VOCAB.find((t) => t.pt);
    if (bare) expect(tagLabel(bare.slug, 'pt')).toBe(bare.slug);
    if (labeled) expect(tagLabel(labeled.slug, 'pt')).toBe(labeled.pt);
  });
});
