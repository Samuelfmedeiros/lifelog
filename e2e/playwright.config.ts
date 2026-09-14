import { defineConfig, devices } from '@playwright/test';

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
  // Servidor gerenciado pelo CI/CD workflow (ou local via pnpm dev)
  // webServer não configurado para evitar conflito com preview server
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: '/usr/bin/chromium',
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
  ],
});
