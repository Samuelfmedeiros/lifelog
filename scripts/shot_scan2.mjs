import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

async function scan(url, label) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll("img"));
    const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => ({ src: i.getAttribute("src"), cls: i.className }));
    const placeholders = Array.from(document.querySelectorAll("[class*='placeholder']")).map(el => el.textContent.trim().slice(0, 40)).filter(Boolean).slice(0, 10);
    return { total: imgs.length, broken, placeholders };
  });
  console.log(`\n=== ${label} (${url}) ===`);
  console.log("total imgs:", info.total, "| quebradas:", info.broken.length);
  if (info.broken.length) console.log("BROKEN:", JSON.stringify(info.broken, null, 1));
  if (info.placeholders.length) console.log("PLACEHOLDERS:", JSON.stringify(info.placeholders));
  await page.screenshot({ path: `demo_capture/check_${label}.png` });
}

await scan("https://lifelog-sepia.vercel.app/arquivo/", "arquivo");
await scan("https://lifelog-sepia.vercel.app/en/", "en_home");
await scan("https://lifelog-sepia.vercel.app/en/archive/", "en_archive");
await browser.close();
console.log("\nDONE");
