import { test, expect } from '@playwright/test';

// 🔴 REGRESSÃO 02/11/2026 — o botão CTA da navbar (link "Portfólio") deve
// seguir a PALETA escolhida, nos dois temas, mantendo contraste AA com letra
// branca (>= 4.5:1).
//
// Sintoma relatado pelo Samuel: "o botão de ir pra portifólio na navbar não
// muda a cor de acordo com a paleta".
//
// Causa raiz: BaseLayout.astro tinha
//   [data-theme="light"] .navbar-link.cta { background: #4f52d6; }
// com especificidade (0,3,0), vencendo o .navbar-link.cta (0,2,0) do
// themes.css que usa var(--navbar-cta-bg). O override congelava o botão no
// índigo #4f52d6 (o aL da paleta roxa) no tema claro.
//
// Este teste FALHA no código antigo:
//  - o assert de "cor muda entre paletas" quebra em light (#4f52d6 fixo);
//  - o de contraste reprova cyan/emerald/amber se alguém voltar a usar o aL cru.

const HEXA = /^#([0-9a-f]{6})$/i;

function parseHex(hex: string): [number, number, number] {
  const m = HEXA.exec(hex);
  if (!m) throw new Error(`hex inesperado: ${hex}`);
  const v = m[1];
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function relLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastWithWhite(hex: string): number {
  const l = relLuminance(parseHex(hex));
  return 1.05 / (l + 0.05);
}

// Espelhos dos valores de src/lib/palettes.ts (fonte da verdade) e da cópia
// inline de PalettePicker.astro — se uma das três divergir, o teste pega.
const EXPECTED_CTA: Record<string, Record<'dark' | 'light', string>> = {
  purple: { dark: '#5d2cb2', light: '#5d2cb2' },
  cyan: { dark: '#066d86', light: '#066d86' },
  emerald: { dark: '#04704f', light: '#04704f' },
  amber: { dark: '#a35904', light: '#a35904' },
  rose: { dark: '#a91636', light: '#a91636' },
  blue: { dark: '#1c4ab0', light: '#1c4ab0' },
};

/** Aplica paleta + tema direto no localStorage e recarrega. */
async function applyState(page: import('@playwright/test').Page, palette: string, theme: 'dark' | 'light') {
  await page.addInitScript(
    ([p, t]) => {
      try {
        localStorage.setItem('lifelog-palette', p as string);
        localStorage.setItem('lifelog-theme', t as string);
      } catch {
        /* storage indisponível */
      }
    },
    [palette, theme] as [string, string],
  );
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  // O script do PalettePicker é is:inline e roda antes do paint; o timeout
  // de verdade é o script inline aplicar as variáveis no :root.
  await page.waitForFunction(
    () => document.documentElement.style.getPropertyValue('--navbar-cta-bg').trim().length > 0,
    undefined,
    { timeout: 8000 },
  );
}

/** Lê a cor COMPUTADA do CTA (o que o usuário vê), não o valor da variável. */
async function readCtaBg(page: import('@playwright/test').Page): Promise<string> {
  const raw = await page.evaluate(() => {
    const el = document.querySelector('.navbar-link.cta');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor; // rgb(...) ou rgba(...)
    const color = cs.color;
    return { bg, color };
  });
  if (!raw) throw new Error('.navbar-link.cta não encontrado na navbar');
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(raw.bg);
  if (!m) throw new Error(`formato inesperado de background: ${raw.bg}`);
  const hex = `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
  return hex;
}

for (const palette of Object.keys(EXPECTED_CTA)) {
  for (const theme of ['dark', 'light'] as const) {
    test(`CTA da navbar segue a paleta ${palette} (${theme}) com contraste AA`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await applyState(page, palette, theme);

      const bg = await readCtaBg(page);
      const expected = EXPECTED_CTA[palette][theme];
      const ratio = contrastWithWhite(bg);

      console.log(`[${palette}/${theme}] cta=${bg} esperado=${expected} contraste=${ratio.toFixed(2)}`);

      // 1) a cor precisa ser a dedicada da paleta
      expect(bg).toBe(expected);
      // 2) e essa cor dedicada precisa passar AA com letra branca
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      // 3) texto continua branco
      const fg = await page.evaluate(() => {
        const el = document.querySelector('.navbar-link.cta');
        return el ? getComputedStyle(el).color : null;
      });
      expect(fg).toBe('rgb(255, 255, 255)');
    });
  }
}

test('CTA muda de cor entre paletas (não fica congelado)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const seen: string[] = [];
  for (const palette of ['purple', 'cyan', 'emerald', 'amber', 'rose', 'blue']) {
    await page.addInitScript(
      ([p, t]) => {
        try {
          localStorage.setItem('lifelog-palette', p as string);
          localStorage.setItem('lifelog-theme', t as string);
        } catch {
          /* noop */
        }
      },
      [palette, 'light'] as [string, string],
    );
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.style.getPropertyValue('--navbar-cta-bg').trim().length > 0,
      undefined,
      { timeout: 8000 },
    );
    seen.push(await readCtaBg(page));
  }
  const unique = new Set(seen);
  console.log('cores por paleta:', JSON.stringify(seen), 'únicas:', unique.size);
  // 6 paletas -> 6 cores distintas (o bug congelava todas em #4f52d6 = 1 única)
  expect(unique.size).toBe(6);
});
