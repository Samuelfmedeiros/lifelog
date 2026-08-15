
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
async function shot(url, path, wait = 3500) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(wait);
    await page.screenshot({ path });
    console.log("OK", path);
  } catch (e) { console.log("ERRO", url, e.message); }
}
await shot("https://lifelog-sepia.vercel.app/", "demo_capture/final_home.png");
await shot("https://lifelog-sepia.vercel.app/post/a-historia-do-seguranca/", "demo_capture/final_seguranca.png");
await shot("https://lifelog-sepia.vercel.app/post/a-historia-do-estudos/", "demo_capture/final_estudos.png");
await shot("https://lifelog-sepia.vercel.app/post/2026-08-12-dogwalk-o-backup-que-mentia/", "demo_capture/final_dogwalk.png");
await shot("https://lifelog-sepia.vercel.app/post/lifelog-a-saga-da-animacao-de-tema-o-desfecho/", "demo_capture/final_saga.png");
await shot("https://samuelmedeiros.vercel.app/", "demo_capture/final_portifolio.png", 5000);
await browser.close();
console.log("DONE");
