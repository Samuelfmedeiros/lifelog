import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

export default defineConfig({
  testDir: '.',
  // 13/09/2026: 20s nao suportava o preview sob carga (net::ERR_ABORTED em
  // vrt/a11y/lifelog). Gate passou a bloquear de verdade, entao o tempo tem que
  // ser suficiente pra ser sinal confiavel — nao mascara de flakiness.
  timeout: 60000,
  retries: 2,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:4321',
    navigationTimeout: 45000,
    // trace so quando falha: evidencia p/ o artefato do CI
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    // VRT — snapshot por componente, tolerância pequena pra animações/antialiasing
    screenshot: { mode: 'only-on-failure', fullPage: false },
  },
  // Servidor: o CI/CD workflow já sobe o preview antes dos testes, e com
  // reuseExistingServer o Playwright reaproveita esse server quando ele já
  // está no ar. Sem NENHUM server ativo (rodada 3 da campanha 23/10: TODOS os
  // e2e morreram com net::ERR_CONNECTION_REFUSED e o critic só viu
  // "e2e playwright falhou:" vazio), o Playwright sobe o próprio preview.
  webServer: {
    command: 'pnpm preview',
    url: 'http://localhost:4321/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          // Pós-migração CachyOS (18/10/2026): `/usr/bin/chromium` existe no
          // runner ubuntu-latest (e é o binário que gerou os baselines
          // versionados), mas NÃO existe na máquina local — lá o chromium é
          // flatpak, exposto em ~/.local/bin/chromium. Sem o fallback, o VRT
          // morria local com "Executable doesn't exist" em TODOS os 4 testes
          // (inclusive o navbar, que passa no CI) e o diagnóstico ficava cego.
          //
          // A ORDEM importa: o CI continua pegando /usr/bin/chromium primeiro,
          // então o render dos baselines não muda. A regeneração canônica
          // segue sendo o workflow vrt-baseline.yml (ubuntu-latest) — rodar
          // local serve para depurar, não para gravar baseline.
          executablePath:
            process.env.PLAYWRIGHT_CHROMIUM_PATH ||
            ['/usr/bin/chromium', `${process.env.HOME}/.local/bin/chromium`].find(
              (p) => p && existsSync(p),
            ) ||
            '/usr/bin/chromium',
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],
});
