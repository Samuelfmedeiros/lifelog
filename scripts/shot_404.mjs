import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const responses = [];

page.on("response", r => {
  if (r.url().includes("/covers/")) {
    responses.push({ url: r.url(), status: r.status() });
  }
});

await page.goto("https://lifelog-sepia.vercel.app/", { waitUntil: "networkidle", timeout: 60000 });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 800) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 200));
  }
  await new Promise(r => setTimeout(r, 800));
});

const bad = responses.filter(r => r.status >= 400);
const ok = responses.filter(r => r.status < 400);
console.log("TOTAL COVERS CARREGADOS:", responses.length, "| OK:", ok.length, "| ERRO:", bad.length);
bad.forEach(r => console.log("  404:", r.url.split("/").pop()));
await browser.close();
console.log("DONE");
