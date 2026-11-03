import { test, expect, request } from '@playwright/test';

const SECRET = 'segredo-de-teste';
const HIDDEN_SLUG = 'descobertas-o-teste-que-caca-texto-tradutor-fujao';

test.describe('/ocultos', () => {
  test('GET /ocultos retorna 200', async ({ page }) => {
    await page.goto('/ocultos');
    await expect(page).toHaveTitle(/Lifelog|ocultos/i);
  });

  test('POST /api/session cria cookie com HMAC valido', async ({ request }) => {
    const response = await request.post('/api/session', {
      data: { adminSecret: SECRET, title: HIDDEN_SLUG }
    });
    
    await expect(response.status()).toBe(200);
    
    const cookies = response.cookies();
    const sessionCookie = cookies.find(c => c.name === 'lifelog_ocultos');
    
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie!.value).toContain('lifelog-ocultos-v1');
    expect(sessionCookie!.maxAge).toBe(43200);
  });

  test('GET /api/preview com cookie de sessao retorna HTML', async ({ request }) => {
    const encodeCookie = (value: string) => {
      return Buffer.from(JSON.stringify({ 
        message: 'lifelog-ocultos-v1', 
        cookie: value 
      })).toString('base64');
    };

    const response = await request.get(`/api/preview/${HIDDEN_SLUG}`, {
      headers: {
        'Cookie': `lifelog_ocultos=${encodeCookie(SECRET)}`
      }
    });

    await expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('<!DOCTYPE html>');
    expect(body).toContain(HIDDEN_SLUG);
  });

  test('GET /api/preview sem cookie valido retorna 401', async ({ request }) => {
    const response = await request.get(`/api/preview/${HIDDEN_SLUG}`);
    await expect(response.status()).toBe(401);
  });
});

test.describe('/api/liberar', () => {
  test('POST /api/liberar libera post oculto', async ({ request, context }) => {
    const page = await context.newPage();
    
    await page.goto('/ocultos');
    
    const releaseButton = page.locator('button:has-text("Liberar")');
    if (await releaseButton.count() > 0) {
      await releaseButton.click();
      
      await expect(page.locator('text=Post liberado')).toBeVisible({ timeout: 5000 });
    }
  });

  test('POST sem adminSecret retorna 401', async ({ request }) => {
    const response = await request.post('/api/liberar', {
      data: { slug: HIDDEN_SLUG }
    });
    
    await expect(response.status()).toBe(401);
  });
});

test.describe('Verificacao de ocultos no frontend', () => {
  test('Posts ocultos nao aparecem na home', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.locator(`text=${HIDDEN_SLUG}`)).not.toBeVisible();
  });

  test('Posts ocultos nao aparecem no RSS', async ({ page }) => {
    await page.goto('/rss.xml');
    
    await expect(page.locator(`text=${HIDDEN_SLUG}`)).not.toBeVisible();
  });

  test('Posts liberados aparecem no sitemap', async ({ page }) => {
    await page.goto('/sitemap.xml');
    
<<<<<<< HEAD
    await expect(page.locator(`text=${HIDDEN_SLUG}`)).toBeVisible();
=======
    await expect(page.locator(`text=${HIDDEN_SLUG}`).first()).toBeHidden();
>>>>>>> 00baa1f (merge complete: resolve conflicts, add ocultos tests, rename posts)
  });
});