import { describe, it, expect } from 'vitest';
import config from '../../e2e/playwright.config';

const cfg = config as {
  use?: { baseURL?: string };
  webServer?: { command?: string; url?: string; reuseExistingServer?: boolean; timeout?: number };
};

/**
 * Guarda da campanha de loop (23/10/2026): o fix do webServer existia só na
 * working tree e nunca foi commitado — o critic avaliava o HEAD sem server e
 * todas as rodadas morriam com "e2e playwright falhou:" (detalhe vazio).
 * Este teste falha se alguém reverter o bootstrap do preview na config.
 */
describe('e2e/playwright.config — bootstrap do preview', () => {
  it('webServer definido: sobe o próprio preview quando nada escuta na 4321', () => {
    expect(cfg.webServer, 'sem webServer a suíte morre net::ERR_CONNECTION_REFUSED sem preview externo').toBeDefined();
    expect(cfg.webServer?.command).toBe('pnpm preview');
    expect(cfg.webServer?.url).toContain(':4321');
    expect(cfg.webServer?.timeout).toBeGreaterThanOrEqual(60_000);
  });

  it('reuseExistingServer: CI/preview externo já no ar é reaproveitado', () => {
    expect(cfg.webServer?.reuseExistingServer).toBe(true);
  });

  it('baseURL aponta para o preview local', () => {
    expect(cfg.use?.baseURL).toContain('localhost:4321');
  });
});
