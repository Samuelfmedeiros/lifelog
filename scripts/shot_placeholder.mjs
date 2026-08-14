import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("https://lifelog-sepia.vercel.app/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(4000);
// procurar elementos que são placeholder visual (svg no lugar de img, ou div com pattern)
const info = await page.evaluate(() => {
  const res = { cards: [] };
  document.querySelectorAll("a[href*='/post/']").forEach((a, i) => {
    const img = a.querySelector("img");
    const svg = a.querySelector("svg");
    const href = a.getAttribute("href");
    res.cards.push({ i, href, hasImg: !!img, hasSvg: !!svg, txt: a.textContent.trim().slice(0, 40) });
  });
  return res;
});
console.log("CARDS:", JSON.stringify(info.cards.filter(c => !c.hasImg), null, 1));
await browser.close();
console.log("DONE");
