import { describe, it, expect, vi } from 'vitest';
import config from '../../e2e/playwright.config';

const cfg = config as {
  use?: { baseURL?: string };
  webServer?: {
    command?: string;
    url?: string;
    cwd?: string;
    reuseExistingServer?: boolean;
    timeout?: number;
  };
};

/**
 * Guarda da campanha de loop (23/10/2026): o fix do webServer existia só na
 * working tree e nunca foi commitado — o critic avaliava o HEAD sem server e
 * todas as rodadas morriam com "e2e playwright falhou:" (detalhe vazio).
 * Este teste falha se alguém reverter o bootstrap do preview na config.
 *
 * 04/11/2026: o contrato mudou porque a config antiga tinha dois defeitos
 * medidos na campanha — `pnpm preview` não aceita porta (colidia com preview
 * órfão de outra worktree) e o comando herdava o cwd de `e2e/`, então o
 * astro preview procurava `e2e/dist` e nem subia localmente. O teste passa a
 * travar OS DOIS: porta derivada do ambiente e cwd na raiz do repo.
 */
const procEnv = process.env as Record<string, string | undefined>;

describe('e2e/playwright.config — bootstrap do preview', () => {
  it('webServer definido: sobe o próprio preview quando nada escuta na 4321', () => {
    expect(cfg.webServer, 'sem webServer a suíte morre net::ERR_CONNECTION_REFUSED sem preview externo').toBeDefined();
    expect(cfg.webServer?.command).toContain('astro preview');
    expect(cfg.webServer?.url).toContain(':4321');
    expect(cfg.webServer?.timeout).toBeGreaterThanOrEqual(60_000);
  });

  it('webServer roda na raiz do repo (astro preview procura ./dist)', () => {
    // Sem `cwd: '..'` o comando roda a partir de e2e/ e morre com
    // "The output directory .../e2e/dist/ does not exist".
    expect(cfg.webServer?.cwd).toBe('..');
  });

  it('reuseExistingServer: só reaproveita no CI (onde o workflow sobe o preview)', () => {
    const isCi = procEnv.CI === 'true';
    expect(cfg.webServer?.reuseExistingServer).toBe(isCi);
  });

  it('baseURL aponta para o preview local', () => {
    expect(cfg.use?.baseURL).toContain('localhost:4321');
  });

  it('baseURL e porta saem do ambiente (E2E_BASE_URL / PLAYWRIGHT_TEST_URL)', async () => {
    vi.resetModules();
    procEnv.E2E_BASE_URL = 'http://127.0.0.1:4399';
    try {
      const mod = await import('../../e2e/playwright.config');
      const c2 = mod.default as typeof cfg;
      expect(c2.use?.baseURL).toBe('http://127.0.0.1:4399');
      expect(c2.webServer?.command).toContain('--port 4399');
      expect(c2.webServer?.url).toContain(':4399');
    } finally {
      delete procEnv.E2E_BASE_URL;
      vi.resetModules();
    }
  });
});
