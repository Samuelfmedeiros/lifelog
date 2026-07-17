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
  viewport: { width: 390, height: 844 }, // iPhone 14
  deviceScaleFactor: 2,
  recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
});

const page = await context.newPage();
await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// 1) Show initial state — theme rail visible inline
await page.waitForTimeout(600);

// 2) Click palette dot 3 (emerald) — show palette change
await page.click('.rail-dot:nth-child(3)');
await page.waitForTimeout(500);

// 3) Click palette dot 5 (rose)
await page.click('.rail-dot:nth-child(5)');
await page.waitForTimeout(500);

// 4) Click palette dot 1 (purple) back to default
await page.click('.rail-dot:nth-child(1)');
await page.waitForTimeout(500);

// 5) Click theme toggle → light mode (circle-wipe)
await page.click('#rail-theme');
await page.waitForTimeout(2000);

// 6) Toggle language → EN
await page.click('#rail-lang');
await page.waitForTimeout(500);

// 7) Toggle language back → PT
await page.click('#rail-lang');
await page.waitForTimeout(500);

// 8) Switch back to dark mode
await page.click('#rail-theme');
await page.waitForTimeout(2000);

// 9) Scroll down a bit to show navbar stays fixed
await page.evaluate(() => window.scrollBy(0, 300));
await page.waitForTimeout(600);

// 10) Scroll back to top
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);

await context.close();
await browser.close();

// Find the video file
const files = fs.readdirSync(videoDir);
const videoFile = files.find(f => f.endsWith('.webm'));
if (videoFile) {
  console.log('VIDEO_PATH:' + path.join(videoDir, videoFile));
} else {
  console.log('No video file found');
}
