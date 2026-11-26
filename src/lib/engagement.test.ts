import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SCROLL_MARKS,
  engagementKey,
  emit,
  nextMark,
  scrollPct,
  shouldSend,
  trackingDisabled,
} from './engagement';

describe('scrollPct', () => {
  it('documento mais curto que a janela = 100%', () => {
    expect(scrollPct(0, 500, 800)).toBe(100);
  });

  it('topo/fim e clamp de overscroll', () => {
    expect(scrollPct(0, 3000, 800)).toBe(0);
    expect(scrollPct(2200, 3000, 800)).toBe(100);
    expect(scrollPct(99999, 3000, 800)).toBe(100);
    expect(scrollPct(-50, 3000, 800)).toBe(0);
  });

  it('valores invalidos nao quebram', () => {
    expect(scrollPct(Number.NaN, 3000, 800)).toBe(0);
    expect(scrollPct(0, 0, 0)).toBe(100);
  });
});

describe('nextMark', () => {
  it('emite o marco cruzado e nunca repete', () => {
    expect(nextMark(24)).toBeNull();
    expect(nextMark(25)).toBe(25);
    expect(nextMark(80, [25, 50, 75])).toBeNull();
    expect(nextMark(100, [25, 50])).toBe(75);
  });

  it('marcos sao 25/50/75/100', () => {
    expect([...SCROLL_MARKS]).toEqual([25, 50, 75, 100]);
  });
});

describe('engagementKey / shouldSend', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('chave e estavel e isolada por prefixo', () => {
    expect(engagementKey('ll', 'scroll', '/post/x:50')).toBe('ll:scroll:/post/x:50');
    expect(engagementKey('', 'click', 'cta')).toBe('eng:click:cta');
  });

  it('respeita sessionStorage quando disponivel', () => {
    const data = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    });
    expect(shouldSend('k')).toBe(true);
    data.set('k', '1');
    expect(shouldSend('k')).toBe(false);
  });
});

describe('trackingDisabled', () => {
  it('DNT e GPC desligam', () => {
    expect(trackingDisabled({ doNotTrack: '1' } as unknown as Navigator)).toBe(true);
    expect(trackingDisabled({ globalPrivacyControl: true } as unknown as Navigator)).toBe(true);
    expect(trackingDisabled({ doNotTrack: '0' } as unknown as Navigator)).toBe(false);
  });
});

describe('emit', () => {
  it('chama window.op("track", ...) e engole erro', () => {
    const calls: unknown[][] = [];
    vi.stubGlobal('window', {
      op: (...args: unknown[]) => void calls.push(args),
    });
    emit('ui_click', { site: 'lifelog', id: 'cta', label: 'Ver mais' });
    expect(calls).toEqual([['track', 'ui_click', { site: 'lifelog', id: 'cta', label: 'Ver mais' }]]);
  });

  it('sem window e silencioso', () => {
    vi.stubGlobal('window', undefined);
    expect(() => emit('x', {})).not.toThrow();
  });
});
