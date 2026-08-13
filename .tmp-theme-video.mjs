// Grava o toggle de tema no LifeLog mobile — círculo expansivo do toque
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '/home/samuel/projetos/lifelog/.tmp-theme-video';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

// ─── Mobile 390×844 ───
const ctxM = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: 'pt-BR',
  recordVideo: { dir: OUT, size: { width: 390, height: 844 } },
});
const pageM = await ctxM.newPage();
await pageM.goto('http://127.0.0.1:4321/', { waitUntil: 'domcontentloaded' });
await pageM.waitForTimeout(1500);

// Garante tema claro pra ver a troca pro escuro (contraste visível)
await pageM.evaluate(() => {
  try { localStorage.setItem('lifelog-theme', 'light'); } catch (e) {}
});
await pageM.reload({ waitUntil: 'domcontentloaded' });
await pageM.waitForTimeout(1200);
await pageM.screenshot({ path: OUT + '/mobile-antes.png' });

// Tap no botão de tema
const btnM = pageM.locator('#rail-theme');
const boxM = await btnM.boundingBox();
await pageM.touchscreen.tap(Math.round(boxM.x + boxM.width / 2), Math.round(boxM.y + boxM.height / 2));
// Captura o meio da animação (círculo parcial) e o final
await pageM.waitForTimeout(120);
await pageM.screenshot({ path: OUT + '/mobile-durante.png' });
await pageM.waitForTimeout(800);
await pageM.screenshot({ path: OUT + '/mobile-depois.png' });

// Toggle de volta (escuro → claro) pra mostrar os dois sentidos
await pageM.touchscreen.tap(Math.round(boxM.x + boxM.width / 2), Math.round(boxM.y + boxM.height / 2));
await pageM.waitForTimeout(900);
await pageM.screenshot({ path: OUT + '/mobile-volta.png' });
await pageM.waitForTimeout(400);

await ctxM.close();

// ─── Desktop 1280×800 (clique) ───
const ctxD = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'pt-BR',
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
});
const pageD = await ctxD.newPage();
await pageD.goto('http://127.0.0.1:4321/', { waitUntil: 'domcontentloaded' });
await pageD.waitForTimeout(1500);
await pageD.evaluate(() => {
  try { localStorage.setItem('lifelog-theme', 'light'); } catch (e) {}
});
await pageD.reload({ waitUntil: 'domcontentloaded' });
await pageD.waitForTimeout(1200);
await pageD.screenshot({ path: OUT + '/desktop-antes.png' });

const btnD = pageD.locator('#rail-theme');
const boxD = await btnD.boundingBox();
await pageD.mouse.click(boxD.x + boxD.width / 2, boxD.y + boxD.height / 2);
await pageD.waitForTimeout(200);
await pageD.screenshot({ path: OUT + '/desktop-durante.png' });
await pageD.waitForTimeout(900);
await pageD.screenshot({ path: OUT + '/desktop-depois.png' });

await ctxD.close();
await browser.close();

console.log('DONE mobile+desktop');
