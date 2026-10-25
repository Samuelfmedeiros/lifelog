import { test, expect } from '@playwright/test';

// Amarração entre ativos (REGRA-AMARRACAO, 18/10/2026).
// Medido em 18/10: o LifeLog linkava o portfólio em 12 páginas SEM UTM nenhum e não
// capturava e-mail em lugar nenhum. Este spec é o gate:
//   1. o bloco "Próximo passo" existe no fim do post (PT e EN);
//   2. TODO link cruzado (portfólio, loja) sai com utm_source=lifelog;
//   3. a captura posta pra loja (skills.seu.pet) com origem + volta pro próprio post;
//   4. a volta da captura (?ok=1) troca o formulário pela confirmação.

const PT_POST = '2026-07-20-lifelog-refactor-arquitetura-componentes';
const EN_POST = PT_POST; // o EN mantém o mesmo nome de arquivo do PT (convenção do projeto)
const PT_URL = `/post/${PT_POST}/`;
const EN_URL = `/en/post/${EN_POST}/`;

const ATIVOS = ['portifolio.seu.pet', 'skills.seu.pet', 'focinho.seu.pet'];

function linksCruzadosSemUtm(html: string): string[] {
  const fora: string[] = [];
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const href = m[1].replace(/&amp;/g, '&');
    if (!ATIVOS.some((a) => href.includes(a))) continue;
    if (!href.includes('utm_source=lifelog&')) fora.push(href);
  }
  return fora;
}

test.describe('Amarração — bloco de próximo passo no post', () => {
  test('PT: bloco existe, captura pra loja e volta pro próprio post', async ({ request }) => {
    const res = await request.get(PT_URL);
    expect(res.status()).toBe(200);
    const html = await res.text();

    expect(html).toContain('id="assinar"');
    expect(html).toContain('Próximo passo');
    // 24/10: o form de captura também é link de saída — vai com UTM (medium=assinar).
    expect(html).toContain('action="https://skills.seu.pet/assinar?utm_source=lifelog');
    expect(html).toContain('utm_medium=assinar');
    expect(html).toContain('name="origem" value="lifelog"');
    expect(html).toContain(`name="volta" value="https://lifelog.seu.pet${PT_URL}"`);
    expect(html).toContain('name="email"');
  });

  test('EN: bloco em inglês e captura na rota EN', async ({ request }) => {
    const res = await request.get(EN_URL);
    expect(res.status()).toBe(200);
    const html = await res.text();

    // Escopo no bloco: o corpo do artigo pode conter a frase em PT sem que o bloco vaze.
    const i = html.indexOf('id="assinar"');
    const bloco = html.slice(i, i + 4000);
    expect(bloco).toContain('Next step');
    expect(bloco).not.toContain('Próximo passo');
    expect(html).toContain('action="https://skills.seu.pet/en/assinar?utm_source=lifelog');
    expect(html).toContain(`name="volta" value="https://lifelog.seu.pet${EN_URL}"`);
  });

  test('nenhum link cruzado sem UTM (PT)', async ({ request }) => {
    const html = await (await request.get(PT_URL)).text();
    expect(linksCruzadosSemUtm(html)).toEqual([]);
  });

  test('nenhum link cruzado sem UTM (EN)', async ({ request }) => {
    const html = await (await request.get(EN_URL)).text();
    expect(linksCruzadosSemUtm(html)).toEqual([]);
  });

  test('navbar e bloco levam UTM com medium distinto e campanha = slug', async ({ request }) => {
    const html = await (await request.get(PT_URL)).text();
    expect(html).toContain('utm_medium=navbar');
    expect(html).toContain('utm_medium=proximo-passo');
    // 24/10: a campanha é o slug do post (sem a data), não mais o literal "post"
    expect(html).toContain('utm_campaign=lifelog-refactor-arquitetura-componentes');
  });

  test('link de saída no CORPO do texto (não só no rodapé), com UTM canônico', async ({ request }) => {
    const html = await (await request.get(PT_URL)).text();
    // o parágrafo inserido no meio do artigo pelo rehype-saida-utm
    expect(html).toContain('amarracao-corpo');
    const corpo = html.slice(html.indexOf('amarracao-corpo'));
    const href = (corpo.match(/href="(https:\/\/skills\.seu\.pet[^"]+)"/) || [])[1] || '';
    const q = new URL(href.replace(/&amp;/g, '&')).searchParams;
    expect(q.get('utm_source')).toBe('lifelog');
    expect(q.get('utm_medium')).toBe('post');
    expect(q.get('utm_campaign')).toBe('lifelog-refactor-arquitetura-componentes');
    expect(q.get('utm_content')).toBe('corpo');
    // e o CTA de rodapé continua existindo, marcado como rodapé
    expect(html).toContain('utm_content=rodape');
  });

  test('volta da captura (?ok=1) troca formulário por confirmação', async ({ page }) => {
    await page.goto(`${PT_URL}?ok=1`);
    await expect(page.locator('#assinar-ok')).toBeVisible();
    await expect(page.locator('#assinar-form')).toBeHidden();
  });

  test('sem ?ok=1 o formulário aparece e a confirmação fica escondida', async ({ page }) => {
    await page.goto(PT_URL);
    await expect(page.locator('#assinar-form')).toBeVisible();
    await expect(page.locator('#assinar-ok')).toBeHidden();
  });

  // Buraco medido em 24/10: a home (91k px de timeline) e o /arquivo não tinham
  // NENHUM link para a loja — só as páginas de post tinham. Este teste fecha o gate.
  test('home e índice têm saída para a loja, com UTM', async ({ request }) => {
    for (const url of ['/', '/en/', '/arquivo', '/en/archive']) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(200);
      const html = await res.text();
      expect(html, `${url} sem link para a loja`).toContain('skills.seu.pet');
      expect(linksCruzadosSemUtm(html), `${url} tem link cruzado sem UTM`).toEqual([]);
    }
  });

  test('alvo de toque de 44px no mobile (regra do dono)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(PT_URL);
    const botao = await page.locator('#assinar button[type="submit"]').boundingBox();
    const campo = await page.locator('#assinar input[type=email]').boundingBox();
    expect(botao!.height).toBeGreaterThanOrEqual(44);
    expect(campo!.height).toBeGreaterThanOrEqual(44);
    // e nada de scroll horizontal no celular
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
  });
});
