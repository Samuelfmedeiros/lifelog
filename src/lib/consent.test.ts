import { describe, it, expect } from 'vitest';
import { DECLINE_CLICKS, declineStep } from './consent';

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
