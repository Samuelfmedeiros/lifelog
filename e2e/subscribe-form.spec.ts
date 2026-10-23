import { test, expect } from '@playwright/test';

const PT_URL = '/post/2026-07-20-lifelog-refactor-arquitetura-componentes/';

test.describe('Inscricao por e-mail - feedback de estado', () => {
  test('estado inicial: form visivel, status/ok escondidos', async ({ page }) => {
    await page.goto(PT_URL);
    await expect(page.locator('#assinar-form')).toBeVisible();
    await expect(page.locator('#assinar-status')).toBeHidden();
    await expect(page.locator('#assinar-ok')).toBeHidden();
  });

  test('volta com ?ok=1 mostra confirmacao com o e-mail e botao trocar', async ({ page }) => {
    await page.goto(PT_URL);
    await page.evaluate(() => sessionStorage.setItem('ll:assinar:email', 'pessoa@exemplo.com'));
    await page.goto(PT_URL + '?ok=1');
    await expect(page.locator('#assinar-form')).toBeHidden();
    await expect(page.locator('#assinar-ok')).toBeVisible();
    await expect(page.locator('#assinar-ok-msg strong')).toHaveText('pessoa@exemplo.com');
    await expect(page.locator('#assinar-ok-edit')).toBeVisible();
    // ?ok sai da URL (bookmark limpo)
    await expect(page).not.toHaveURL(/\?ok=1/);
  });

  test('botao trocar revela o form de novo', async ({ page }) => {
    await page.goto(PT_URL);
    await page.evaluate(() => sessionStorage.setItem('ll:assinar:email', 'pessoa@exemplo.com'));
    await page.goto(PT_URL + '?ok=1');
    await page.click('#assinar-ok-edit');
    await expect(page.locator('#assinar-ok')).toBeHidden();
    await expect(page.locator('#assinar-form')).toBeVisible();
    await expect(page.locator('#assinar-email')).toBeFocused();
  });

  test('envio recente sem ?ok=1 mostra falha e destrava', async ({ page }) => {
    await page.goto(PT_URL);
    await page.evaluate(() => sessionStorage.setItem('ll:assinar:enviado', String(Date.now())));
    await page.reload();
    await expect(page.locator('#assinar-status')).toContainText('consegui confirmar');
    await expect(page.locator('#assinar-btn')).toBeEnabled();
  });
});
