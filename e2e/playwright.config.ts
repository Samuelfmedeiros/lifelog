import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

// GitHub Actions exporta CI=true; local (sem a variavel) roda falso.
// Cast explícito porque @types/node não está completo nesta árvore.
const env = process.env as Record<string, string | undefined>;
const isCi = env.CI === 'true';
// Endereço do preview sai do ambiente (mesma convenção de record-demo.spec.ts).
// Deriva a porta da URL: `astro preview` não lê a env, precisa de --port.
const previewBaseUrl =
  env.E2E_BASE_URL || env.PLAYWRIGHT_TEST_URL || 'http://localhost:4321';
const previewPort = new URL(previewBaseUrl).port || '4321';

export default defineConfig({
  testDir: '.',
  // 13/09/2026: 20s nao suportava o preview sob carga (net::ERR_ABORTED em
  // vrt/a11y/lifelog). Gate passou a bloquear de verdade, entao o tempo tem que
  // ser suficiente pra ser sinal confiavel — nao mascara de flakiness.
  timeout: 60000,
  retries: 2,
  fullyParallel: false,
  use: {
    // 03/11/2026: a porta sai do ambiente (mesma convenção que
    // e2e/record-demo.spec.ts já usa). O CI exporta PLAYWRIGHT_TEST_URL mas
    // NINGUEM lia — com o endereço fixo no config, rodar a suite local ao lado
    // de outro preview (campanha viva) era impossivel sem EADDRINUSE.
    baseURL: previewBaseUrl,
    navigationTimeout: 45000,
    // trace so quando falha: evidencia p/ o artefato do CI
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    // VRT — snapshot por componente, tolerância pequena pra animações/antialiasing
    screenshot: { mode: 'only-on-failure', fullPage: false },
  },
  // Servidor: no CI o workflow já sobe o preview na :4321 antes dos testes
  // (deploy.yml "Start preview server"), então lá REAPROVEITAR é o contrato.
  // LOCAL é o oposto: reuseExistingServer=true fez a suíte inteira rodar
  // 20 min contra um preview órfão de outra worktree na mesma porta
  // (medido 03/11) — prova inválida com cara de verde. Local (~CI ausente)
  // sobe o server desta árvore ou estoura EADDRINUSE alto, nunca silêncio.
  webServer: {
    // O Playwright roda o comando a partir do diretorio do CONFIG (e2e/).
    // Sem `cwd: '..'` o astro preview procura e2e/dist e morre com
    // "The output directory .../e2e/dist/ does not exist" (medido 04/11).
    cwd: '..',
    // Mesma URL do baseURL: o preview que sobe aqui tem que escutar EXATAMENTE
    // onde os testes navegam. Deriva a porta de E2E_BASE_URL (default 4321).
    url: `${previewBaseUrl}/`,
    // -p <porta>: astro preview nao le E2E_BASE_URL, e a porta default dele
    // (4321) nao coincide com a de E2E_BASE_URL quando esta eh sobrescrita.
    command: `pnpm exec astro preview --port ${previewPort}`,
    reuseExistingServer: isCi,
    timeout: 120_000,
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
