import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const videoDir = path.join(__dirname, '..', '.video-capture');
if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
});

const page = await context.newPage();
await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// 1) Show initial state — all controls visible
await page.waitForTimeout(500);

// 2) Open color dropdown → shows 6 dots downward
await page.click('#rail-color');
await page.waitForTimeout(600);

// 3) Pick emerald
await page.click('.rail-dot[data-palette="emerald"]');
await page.waitForTimeout(500);

// 4) Open & pick rose
await page.click('#rail-color');
await page.waitForTimeout(300);
await page.click('.rail-dot[data-palette="rose"]');
await page.waitForTimeout(500);

// 5) Open & pick purple (default)
await page.click('#rail-color');
await page.waitForTimeout(300);
await page.click('.rail-dot[data-palette="purple"]');
await page.waitForTimeout(500);

// 6) Toggle theme → light
await page.click('#rail-theme');
await page.waitForTimeout(2000);

// 7) Toggle lang → EN
await page.click('#rail-lang');
await page.waitForTimeout(400);

// 8) Toggle lang → PT
await page.click('#rail-lang');
await page.waitForTimeout(400);

// 9) Toggle theme → dark
await page.click('#rail-theme');
await page.waitForTimeout(2000);

// 10) Scroll to show navbar stays intact
await page.evaluate(() => window.scrollBy(0, 300));
await page.waitForTimeout(600);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);

await context.close();
await browser.close();

const files = fs.readdirSync(videoDir);
const videoFile = files.find(f => f.endsWith('.webm'));
if (videoFile) {
  console.log('VIDEO_PATH:' + path.join(videoDir, videoFile));
} else {
  console.log('No video file found');
}
