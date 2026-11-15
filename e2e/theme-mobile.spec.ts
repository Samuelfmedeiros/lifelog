import { test, expect } from '@playwright/test';

/**
 * Regressão do tema no mobile (viewport iPhone 14).
 *
 * 15/11/2026 — este spec era um script de debug que nunca falhava por
 * comportamento: não tinha nenhum `expect()`, só `console.log`, e navegava
 * direto para `https://lifelog.seu.pet/` ignorando o `baseURL` do config
 * (portanto o preview local). Falhava só por timeout, porque usava
 * `waitUntil: 'networkidle'` — a mesma armadilha que `e2e/vrt.spec.ts:41`
 * já documenta ("não usar networkidle"). Resultado: 1 de 669 testes E2E
 * falhando de forma intermitente e mascarando o que ele deveria proteger.
 *
 * Regra que fica: aqui se mede COMPORTAMENTO (o tema troca de fato e persiste).
 * Navegação usa `domcontentloaded` + espera explícita do elemento.
 *
 * Estrutura real (src/components/PalettePicker.astro): `#theme-rail` é sempre
 * visível — não existe `#rail-toggle`. `#rail-theme` alterna o tema direto;
 * `#rail-color` abre o dropdown de paleta.
 */
test('mobile theme check', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.navbar')).toBeVisible({ timeout: 15000 });

  // Dispensa o banner de consentimento: no mobile ele cobre o rail e o clique
  // falharia por interceptação, não por bug de tema.
  const aceitar = page.getByRole('button', { name: 'Aceitar' });
  if (await aceitar.isVisible().catch(() => false)) {
    await aceitar.click();
    await expect(aceitar).toBeHidden({ timeout: 5000 });
  }

  // 1) O tema claro tem regras de navbar próprias — é o que mantém a navbar
  // creme no mobile (preferência do dono: páginas principais SEMPRE claras).
  const hasLightThemeRules = await page.evaluate(() =>
    Array.from(document.styleSheets).some((sheet) => {
      try {
        return Array.from(sheet.cssRules || []).some((rule) =>
          rule.cssText?.includes('[data-theme="light"]'),
        );
      } catch {
        return false; // stylesheet cross-origin: não legível, não é falha
      }
    }),
  );
  expect(hasLightThemeRules, 'faltam regras [data-theme="light"] no CSS').toBe(true);

  // 2) Estado inicial registrado e válido.
  const before = await page.evaluate(() => {
    const nav = document.querySelector('.navbar');
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      navbar: nav ? getComputedStyle(nav).backgroundColor : null,
    };
  });
  expect(before.navbar, 'navbar sem backgroundColor computado').not.toBeNull();

  // 3) O botão alterna o tema para um valor DIFERENTE do atual.
  await page.locator('#rail-theme').click();
  await expect
    .poll(
      () =>
        page.evaluate(() => document.documentElement.getAttribute('data-theme')),
      { timeout: 5000, message: 'data-theme não mudou após clicar no toggle' },
    )
    .not.toBe(before.theme);

  // 4) O efeito visual acompanha o atributo: a navbar muda de cor.
  const after = await page.evaluate(() => {
    const nav = document.querySelector('.navbar');
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      navbar: nav ? getComputedStyle(nav).backgroundColor : null,
    };
  });
  expect(after.navbar, 'navbar não recalculou a cor após trocar o tema').not.toBe(
    before.navbar,
  );

  // 5) A escolha persiste (o usuário não perde o tema ao recarregar).
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.navbar')).toBeVisible({ timeout: 15000 });
  const persisted = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme'),
  );
  expect(persisted, 'tema escolhido não persistiu após reload').toBe(after.theme);
});
