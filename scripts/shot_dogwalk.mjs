import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// slug correto com data
const url = "https://lifelog-sepia.vercel.app/post/2026-08-12-dogwalk-o-backup-que-mentia/";
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(2500);
console.log("URL FINAL:", page.url());
console.log("TITLE:", await page.title());
const imgs = await page.$$eval("img", els => els.map(i => ({ src: i.getAttribute("src"), w: i.naturalWidth, h: i.naturalHeight, complete: i.complete })));
console.log("IMGS:", JSON.stringify(imgs));
await page.screenshot({ path: "demo_capture/post_dogwalk_certo.png" });
await browser.close();
console.log("DONE");
