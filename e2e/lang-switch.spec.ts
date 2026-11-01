import { test, expect } from '@playwright/test';

// Regression: language switcher must keep you on the SAME page.
// Bug (11/09): href was hardcoded to home — switching EN/PT from any
// deep page (tag, post, archive) always landed back on the front page.

const LANG_SELECTOR = 'a.navbar-lang';

test.describe('language switch keeps current page', () => {
  test('tag page PT -> EN stays on the tag', async ({ page }) => {
    await page.goto('/tag/arachne/');
    await expect(page.locator(LANG_SELECTOR)).toHaveAttribute('href', '/en/tag/arachne/');
  });

  test('tag page EN -> PT stays on the tag', async ({ page }) => {
    await page.goto('/en/tag/yurumi/');
    await expect(page.locator(LANG_SELECTOR)).toHaveAttribute('href', '/tag/yurumi/');
  });

  test('post page EN -> PT stays on the post', async ({ page }) => {
    await page.goto('/post/a-historia-do-lifelog/');
    // PT post has no /en/ twin necessarily; just assert it is NOT the home shortcut
    const href = await page.locator(LANG_SELECTOR).getAttribute('href');
    expect(href).toBe('/en/post/a-historia-do-lifelog/');
  });

  test('archive alias PT -> EN uses /en/archive', async ({ page }) => {
    await page.goto('/arquivo');
    await expect(page.locator(LANG_SELECTOR)).toHaveAttribute('href', '/en/archive');
  });

  test('about alias EN -> PT uses /sobre', async ({ page }) => {
    await page.goto('/en/about');
    await expect(page.locator(LANG_SELECTOR)).toHaveAttribute('href', '/sobre');
  });

  test('home still swaps to /en/ and back', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(LANG_SELECTOR)).toHaveAttribute('href', '/en/');
    await page.goto('/en/');
    await expect(page.locator(LANG_SELECTOR)).toHaveAttribute('href', '/');
  });

  test('ocultos (PT-only) falls back to EN home, not 404', async ({ page }) => {
    await page.goto('/ocultos');
    await expect(page.locator(LANG_SELECTOR)).toHaveAttribute('href', '/en/');
  });
});

// O botao de idioma do preview oculto (PT <-> EN mantendo o slug) era testado aqui
// quando /ocultos/preview/** era pagina estatica. Desde 01/11/2026 esse HTML e
// servido por /api/preview sob cookie, entao a verificacao vive onde a rota existe:
// scripts/check-preview-gate.mjs (local) e scripts/check-ocultos-gate.mjs (producao).
