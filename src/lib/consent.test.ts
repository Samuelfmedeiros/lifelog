import { describe, it, expect } from 'vitest';
import {
  CONSENT_KEY,
  CONSENT_EVENT,
  DECLINE_CLICKS,
  clearConsent,
  declineStep,
  readConsent,
  writeConsent,
} from './consent';

/** Storage mínimo, em memória, com a mesma superfície que o código usa. */
function fakeStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    _map: map,
  } as unknown as Storage & { _map: Map<string, string> };
}

describe('consent — storage (LGPD)', () => {
  it('readConsent devolve o valor gravado', () => {
    expect(readConsent(fakeStorage({ [CONSENT_KEY]: 'accepted' }))).toBe('accepted');
    expect(readConsent(fakeStorage({ [CONSENT_KEY]: 'declined' }))).toBe('declined');
  });

  it('readConsent: ausente, storage nulo ou lixo => null (nunca inventa consent)', () => {
    expect(readConsent(fakeStorage())).toBeNull();
    expect(readConsent(null)).toBeNull();
    expect(readConsent(undefined)).toBeNull();
    // valor fora do union não deve virar consent por acidente
    expect(readConsent(fakeStorage({ [CONSENT_KEY]: 'yes' }))).toBeNull();
    expect(readConsent(fakeStorage({ [CONSENT_KEY]: '' }))).toBeNull();
  });

  it('readConsent: storage que lança (modo restritivo) => null, sem quebrar a página', () => {
    const explode = {
      getItem: () => {
        throw new Error('SecurityError: storage bloqueado');
      },
    } as unknown as Storage;
    expect(readConsent(explode)).toBeNull();
  });

  it('writeConsent grava na chave única', () => {
    const s = fakeStorage();
    writeConsent(s, 'declined');
    expect((s as unknown as { _map: Map<string, string> })._map.get(CONSENT_KEY)).toBe('declined');
    expect(readConsent(s)).toBe('declined');
  });

  it('writeConsent: storage nulo ou que lança não propaga erro', () => {
    expect(() => writeConsent(null, 'accepted')).not.toThrow();
    expect(() => writeConsent(undefined, 'accepted')).not.toThrow();
    const explode = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    expect(() => writeConsent(explode, 'accepted')).not.toThrow();
  });

  it('clearConsent remove a escolha (link "rever preferências")', () => {
    const s = fakeStorage({ [CONSENT_KEY]: 'accepted' });
    clearConsent(s);
    expect(readConsent(s)).toBeNull();
  });

  it('clearConsent: storage nulo ou que lança não propaga erro', () => {
    expect(() => clearConsent(null)).not.toThrow();
    const explode = {
      removeItem: () => {
        throw new Error('SecurityError');
      },
    } as unknown as Storage;
    expect(() => clearConsent(explode)).not.toThrow();
  });

  it('CONSENT_KEY e CONSENT_EVENT são strings estáveis (guard depende de UM lugar só)', () => {
    expect(typeof CONSENT_KEY).toBe('string');
    expect(CONSENT_KEY).toBe('lifelog-analytics-consent');
    expect(typeof CONSENT_EVENT).toBe('string');
    expect(CONSENT_EVENT.length).toBeGreaterThan(0);
  });

  it('ciclo completo: aceita -> limpa -> recusa', () => {
    const s = fakeStorage();
    writeConsent(s, 'accepted');
    expect(readConsent(s)).toBe('accepted');
    clearConsent(s);
    expect(readConsent(s)).toBeNull();
    writeConsent(s, 'declined');
    expect(readConsent(s)).toBe('declined');
  });
});

describe('declineStep — recusa em N cliques', () => {
  it('exige exatamente DECLINE_CLICKS cliques para concluir', () => {
    let count = 0;
    let done = false;
    for (let i = 1; i <= DECLINE_CLICKS; i += 1) {
      const step = declineStep(count);
      count = step.count;
      done = step.done;
      expect(step.count).toBe(i);
      // Antes do último clique nunca conclui.
      expect(step.done).toBe(i === DECLINE_CLICKS);
    }
    expect(done).toBe(true);
    expect(count).toBe(DECLINE_CLICKS);
  });

  it('remaining conta para trás até zero', () => {
    expect(declineStep(0).remaining).toBe(DECLINE_CLICKS - 1);
    expect(declineStep(DECLINE_CLICKS - 2).remaining).toBe(1);
    expect(declineStep(DECLINE_CLICKS - 1).remaining).toBe(0);
    expect(declineStep(DECLINE_CLICKS - 1).done).toBe(true);
  });

  it('não aceita estado inválido como atalho', () => {
    // NaN/Infinity/negativo caem para 0 cliques; fração é truncada (1.9 -> 1).
    expect(declineStep(Number.NaN as number).count).toBe(1);
    expect(declineStep(Number.POSITIVE_INFINITY).count).toBe(1);
    expect(declineStep(-5).count).toBe(1);
    expect(declineStep(1.9).count).toBe(2);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -5, undefined as unknown as number]) {
      const step = declineStep(bad as number);
      expect(step.done).toBe(false);
    }
  });

  it('clicar além do necessário não estoura o contador de faltantes', () => {
    const step = declineStep(DECLINE_CLICKS + 10);
    expect(step.remaining).toBe(0);
    expect(step.done).toBe(true);
  });

  it('DECLINE_CLICKS é o valor de produto acordado (6)', () => {
    expect(DECLINE_CLICKS).toBe(6);
  });
});
