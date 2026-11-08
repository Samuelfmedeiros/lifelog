import { describe, expect, it, vi } from 'vitest';
import {
  buildPayload,
  computePct,
  depthKey,
  alreadySent,
  markSent,
} from './post-depth';

describe('computePct', () => {
  it('documento curto = 100% lido', () => {
    expect(computePct(0, 500, 800)).toBe(100);
  });

  it('topo da página = 0%', () => {
    expect(computePct(0, 3000, 800)).toBe(0);
  });

  it('fim da página = 100%', () => {
    expect(computePct(2200, 3000, 800)).toBe(100);
  });

  it('meio do caminho = 50%', () => {
    expect(computePct(1100, 3000, 800)).toBe(50);
  });

  it('nunca passa de 100 nem fica negativo (overscroll)', () => {
    expect(computePct(99999, 3000, 800)).toBe(100);
    expect(computePct(-50, 3000, 800)).toBe(0);
  });

  it('altura zerada/NaN não quebra', () => {
    expect(computePct(0, 0, 0)).toBe(100);
    expect(computePct(Number.NaN, 3000, 800)).toBe(0);
  });
});

describe('buildPayload', () => {
  const base = {
    path: '/post/2026-11-04-ollama-truncation-loop/',
    title: 'Ollama truncation loop',
    slug: 'ollama-truncation-loop',
    locale: 'pt-BR',
  };

  it('emite post_depth com __title e pct (contrato do script Python)', () => {
    const p = buildPayload({ ...base, pct: 73, ms: 1234 });
    expect(p.name).toBe('post_depth');
    expect(p.properties.__title).toBe('Ollama truncation loop');
    expect(p.properties.pct).toBe(73);
    expect(p.properties.ms).toBe(1234);
    expect(p.path).toBe(base.path);
  });

  it('grameia pct fora de faixa', () => {
    expect(buildPayload({ ...base, pct: 150, ms: 0 }).properties.pct).toBe(100);
    expect(buildPayload({ ...base, pct: -3, ms: 0 }).properties.pct).toBe(0);
  });

  it('locale sai no contrato do JSON-LD do post (pt-BR/en), nunca "pt"', () => {
    expect(buildPayload({ ...base, pct: 10, ms: 0 }).properties.locale).toBe('pt-BR');
    expect(buildPayload({ ...base, locale: 'en', pct: 10, ms: 0 }).properties.locale).toBe('en');
  });

  it('slug sem prefixo de idioma/data para cruzar com o relatório', () => {
    expect(buildPayload({ ...base, pct: 10, ms: 0 }).properties.slug)
      .toBe('ollama-truncation-loop');
  });
});

describe('dedupe por sessão', () => {
  it('marca e reconhece o envio', () => {
    // vitest roda em environment 'node': lá não existe sessionStorage e o
    // módulo devolve null ("não sei") por design. Para exercitar o dedupe de
    // verdade, injeta um storage com a mesma API antes de chamar.
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
    const k = depthKey('/post/x/');
    if (alreadySent(k)) markSent(k); // garante partida limpa
    expect(alreadySent(k)).toBe(false);
    markSent(k);
    expect(alreadySent(k)).toBe(true);
    vi.unstubAllGlobals();
  });

  it('sem storage devolve null (não sabe) em vez de mentir false', () => {
    // Contrato do módulo: storage bloqueado = null, e o chamador emite o
    // evento assim mesmo. Perder métrica é pior que duplicar.
    vi.stubGlobal('sessionStorage', undefined);
    const k = depthKey('/post/y/');
    expect(alreadySent(k)).toBe(null);
    expect(() => markSent(k)).not.toThrow();
    vi.unstubAllGlobals();
  });
});
