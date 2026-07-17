const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
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
  await page.waitForTimeout(800);

  // 2) Click theme toggle → light mode (circle-wipe)
  await page.click('#rail-theme');
  await page.waitForTimeout(1500);

  // 3) Click palette dot 3 (emerald)
  await page.click('.rail-dot:nth-child(3)');
  await page.waitForTimeout(600);

  // 4) Click palette dot 5 (rose)
  await page.click('.rail-dot:nth-child(5)');
  await page.waitForTimeout(600);

  // 5) Click palette dot 1 (cyan)
  await page.click('.rail-dot:nth-child(2)');
  await page.waitForTimeout(600);

  // 6) Toggle language → EN
  await page.click('#rail-lang');
  await page.waitForTimeout(600);

  // 7) Toggle language back → PT
  await page.click('#rail-lang');
  await page.waitForTimeout(600);

  // 8) Switch back to dark mode
  await page.click('#rail-theme');
  await page.waitForTimeout(1500);

  // 9) Scroll down a bit to show navbar stays
  await page.evaluate(() => window.scrollBy(0, 300));
  await page.waitForTimeout(800);

  // 10) Scroll back to top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

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
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
