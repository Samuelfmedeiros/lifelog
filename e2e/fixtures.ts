import { test as base } from '@playwright/test';

/** Tipo explícito das fixtures — sem isso o TS 6 não infere o mapa de
 *  fixtures do playwright e todo `{ goto }` nos specs vira ts(2339). */
type LifelogFixtures = {
  goto: (path?: string) => Promise<import('@playwright/test').Response | null>;
  home: () => Promise<import('@playwright/test').Response | null>;
};

/**
 * Fixtures do LifeLog — elimina repetição de navegação e espera.
 * Uso: import { test } from './fixtures';
 */
export const test = base.extend<LifelogFixtures>({
  /**
   * goto: navega até uma rota com waitForLoadState('networkidle') padronizado.
   * Retorna a Response (pra testes que leem headers/texto, ex: RSS).
   * Uso: await goto('/');  const resp = await goto('/rss.xml');
   */
  goto: async ({ page }, use) => {
    const goto = async (path = '/') => {
      const response = await page.goto(path);
      await page.waitForLoadState('networkidle');
      return response;
    };
    await use(goto);
  },

  /**
   * home: atalho pra goto('/') — o caso mais comum nos testes.
   */
  home: async ({ page }, use) => {
    const home = async () => {
      const response = await page.goto('/');
      await page.waitForLoadState('networkidle');
      return response;
    };
    await use(home);
  },
});

export { expect } from '@playwright/test';
