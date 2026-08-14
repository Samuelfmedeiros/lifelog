import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("https://lifelog-sepia.vercel.app/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(4000);

// Todos os cards de post: capa visível? placeholder? link?
const cards = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("article, [class*='card'], li").forEach((el, i) => {
    const img = el.querySelector("img");
    const link = el.querySelector("a[href*='/post/']");
    if (!link) return;
    const title = el.textContent.trim().slice(0, 60).replace(/\s+/g, " ");
    const coverInfo = img
      ? { hasImg: true, loaded: img.complete && img.naturalWidth > 0, src: img.getAttribute("src") }
      : { hasImg: false };
    out.push({ i, title, coverInfo });
  });
  return out;
});
console.log("CARDS:", JSON.stringify(cards.slice(0, 12), null, 1));

// imagens quebradas em geral
const broken = await page.$$eval("img", els => els.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute("src")));
console.log("BROKEN:", JSON.stringify(broken));
await page.screenshot({ path: "demo_capture/emoji_home_v2.png" });
await browser.close();
console.log("DONE");
