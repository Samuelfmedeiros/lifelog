import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("https://lifelog-sepia.vercel.app/", { waitUntil: "networkidle", timeout: 60000 });
// scroll até o fim para forçar lazy-load
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 800) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 200));
  }
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 800));
});
const broken = await page.$$eval("img", els => els.filter(i => i.complete && i.naturalWidth === 0).map(i => ({ src: i.getAttribute("src"), alt: i.alt })));
console.log("BROKEN HOME FULL:", JSON.stringify(broken, null, 1));
console.log("total:", await page.$$eval("img", els => els.length));

// posts recentes individualmente
for (const slug of ["a-historia-do-seguranca", "a-historia-do-estudos", "dogwalk-o-backup-que-mentia"]) {
  await page.goto(`https://lifelog-sepia.vercel.app/post/${slug}/`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(2000);
  const imgs = await page.$$eval("img", els => els.map(i => ({ src: i.getAttribute("src"), w: i.naturalWidth, complete: i.complete })));
  console.log(`\n${slug}:`, JSON.stringify(imgs));
}
await browser.close();
console.log("\nDONE");
