import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto("https://lifelog-sepia.vercel.app/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3000);
const covers = await page.$$eval("img[src*='/covers/']", els => els.slice(0,6).map(i => ({src: i.getAttribute("src"), w: i.naturalWidth, h: i.naturalHeight, complete: i.complete})));
console.log("CAPAS:", JSON.stringify(covers));
const broken = await page.$$eval("img", els => els.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute("src")));
console.log("QUEBRADAS:", JSON.stringify(broken));
await page.screenshot({ path: "demo_capture/lifelog_home.png" });
console.log("SHOT_HOME_OK");
await browser.close();
