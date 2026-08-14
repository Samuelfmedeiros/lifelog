import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

async function shot(url, path, wait = 3000, full = false) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(wait);
    await page.screenshot({ path, fullPage: full });
    console.log("OK:", path);
  } catch (e) {
    console.log("ERRO:", url, e.message);
  }
}

// LifeLog
await shot("https://lifelog-sepia.vercel.app/", "demo_capture/emoji_home.png", 3500);
await shot("https://lifelog-sepia.vercel.app/arquivo/", "demo_capture/emoji_arquivo.png", 3000);
await shot("https://lifelog-sepia.vercel.app/post/a-historia-do-estudos/", "demo_capture/emoji_post_estudos.png", 3000);
await shot("https://lifelog-sepia.vercel.app/post/2026-07-20-lifelog-refactor-arquitetura-componentes/", "demo_capture/emoji_post_refactor.png", 3000);
await shot("https://lifelog-sepia.vercel.app/sobre/", "demo_capture/emoji_sobre.png", 3000);
await shot("https://lifelog-sepia.vercel.app/en/", "demo_capture/emoji_en_home.png", 3000);

// Portifólio
await shot("https://samuelmedeiros.vercel.app/", "demo_capture/emoji_port_home.png", 5000);
await shot("https://samuelmedeiros.vercel.app/#jogos", "demo_capture/emoji_port_games.png", 5000);

await browser.close();
console.log("DONE");
