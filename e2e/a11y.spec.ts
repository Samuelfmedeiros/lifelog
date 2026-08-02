import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

/**
 * Fase 4.1 — Acessibilidade (axe-core)
 * Varredura de contraste WCAG + semântica HTML nas páginas principais,
 * nos dois temas (dark e light).
 *
 * Nota: usa uma URL de post fixa pra varredura (não depende de dados dinâmicos).
 */
const POST_URL = '/post/a-historia-do-lifelog/';

async function scanPage(page: any, url: string, theme: 'dark' | 'light') {
  // Garante o tema antes de navegar (localStorage persiste)
  await page.addInitScript((t) => {
    try { localStorage.setItem('lifelog-theme', t) } catch {}
  }, theme);
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  const results = await new AxeBuilder({ page }).analyze();
  return results;
}

test.describe('Acessibilidade (axe-core)', () => {
  test('home — tema dark sem violações críticas', async ({ page }) => {
    const results = await scanPage(page, '/', 'dark');
    const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(violations, JSON.stringify(violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2)).toEqual([]);
  });

  test('home — tema light sem violações críticas', async ({ page }) => {
    const results = await scanPage(page, '/', 'light');
    const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(violations, JSON.stringify(violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2)).toEqual([]);
  });

  test('arquivo — tema dark sem violações críticas', async ({ page }) => {
    const results = await scanPage(page, '/arquivo', 'dark');
    const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(violations, JSON.stringify(violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2)).toEqual([]);
  });

  test('sobre — tema dark sem violações críticas', async ({ page }) => {
    const results = await scanPage(page, '/sobre', 'dark');
    const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(violations, JSON.stringify(violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2)).toEqual([]);
  });

  test('post — tema light sem violações críticas', async ({ page }) => {
    const results = await scanPage(page, POST_URL, 'light');
    const violations = results.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    expect(violations, JSON.stringify(violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })), null, 2)).toEqual([]);
  });

  test('navbar tem links com nomes acessíveis', async ({ page, goto }) => {
    await goto('/');
    const nav = page.getByRole('navigation');
    const links = nav.getByRole('link');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(4);
    for (let i = 0; i < count; i++) {
      const name = await links.nth(i).getAttribute('aria-label') || await links.nth(i).textContent();
      expect(name?.trim().length).toBeGreaterThan(0);
    }
  });

  test('theme rail buttons têm nomes acessíveis', async ({ page, goto }) => {
    await goto('/');
    await expect(page.getByLabel('Alternar tema')).toBeVisible();
    await expect(page.getByLabel('Paleta de cores')).toBeVisible();
    await expect(page.getByLabel('Alternar idioma')).toBeVisible();
  });
});
