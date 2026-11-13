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
 *
 * 12/11/2026 — porta vem do ambiente (PLAYWRIGHT_TEST_URL). Antes a config
 * exigia 4321 fixo e o CI no mesmo host do Roger (que também sobe em 4321)
 * falhava com "Preview server didn't start", sintoma que parece bug de produto.
 * O default local continua 4321; o que se garante aqui é que a porta é
 * CONFIGURÁVEL e que webServer/baseURL leem a MESMA fonte.
 */
describe('e2e/playwright.config — bootstrap do preview', () => {
  it('webServer definido: sobe o próprio preview quando nada escuta', () => {
    expect(cfg.webServer, 'sem webServer a suíte morre net::ERR_CONNECTION_REFUSED sem preview externo').toBeDefined();
    expect(cfg.webServer?.command).toContain('pnpm preview');
    expect(cfg.webServer?.command).toContain('--port');
    expect(cfg.webServer?.url).toMatch(/^https?:\/\//);
    expect(cfg.webServer?.timeout).toBeGreaterThanOrEqual(60_000);
  });

  it('reuseExistingServer: CI/preview externo já no ar é reaproveitado', () => {
    expect(cfg.webServer?.reuseExistingServer).toBe(true);
  });

  it('baseURL e webServer falam da MESMA porta (nunca divergem)', () => {
    expect(cfg.use?.baseURL).toMatch(/^https?:\/\//);
    const basePort = new URL(cfg.use!.baseURL!).port || '4321';
    const serverPort = new URL(cfg.webServer!.url!).port || '4321';
    expect(serverPort).toBe(basePort);
    expect(cfg.webServer?.command).toContain(basePort);
  });

  it.skipIf(Boolean(process.env.PLAYWRIGHT_TEST_URL))(
    'default local continua 4321 (só vale sem PLAYWRIGHT_TEST_URL no ambiente)',
    () => {
      expect(cfg.use?.baseURL).toContain('4321');
    }
  );
});
