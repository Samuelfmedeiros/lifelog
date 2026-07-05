import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 15000,
  retries: 0,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:4321',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'pnpm astro preview --port 4321',
    port: 4321,
    reuseExistingServer: false,
    timeout: 15000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
