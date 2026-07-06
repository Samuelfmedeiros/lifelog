// Record theme toggle + post click demo video — HIGH QUALITY
import { chromium } from '@playwright/test';
import { writeFileSync, readdirSync, renameSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2, // retina
    recordVideo: {
      dir: outDir,
      size: { width: 1280, height: 800 },
    },
  });

  const page = await context.newPage();

  // ========== 1. HOMEPAGE — DARK MODE COM ESTRELAS ==========
  console.log('[1/7] Homepage dark mode...');
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  // Suave scroll down & up
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // ========== 2. OPEN THEME RAIL ==========
  console.log('[2/7] Opening theme rail...');
  await page.locator('#rail-toggle').click();
  await page.waitForTimeout(1200);

  // ========== 3. TOGGLE TO LIGHT MODE ==========
  console.log('[3/7] Toggle to light mode...');
  const themeBtn = page.locator('#rail-theme');
  await themeBtn.click();
  await page.waitForTimeout(3500); // longer for circle-wipe + particles

  // Scroll to show the golden dust + solar rays
  await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // ========== 4. TOGGLE BACK TO DARK ==========
  console.log('[4/7] Toggle back to dark...');
  await themeBtn.click();
  await page.waitForTimeout(3000);

  // ========== 5. CLOSE RAIL + CLICK POST ==========
  console.log('[5/7] Clicking first post...');
  await page.locator('#rail-toggle').click();
  await page.waitForTimeout(800);

  const firstCardLink = page.locator('.post-card a').first();
  await firstCardLink.click();
  await page.waitForURL('**/post/**');
  await page.waitForTimeout(3000);

  // Scroll in post
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }));
  await page.waitForTimeout(1500);

  // ========== 6. BACK TO HOME ==========
  console.log('[6/7] Back to home...');
  await page.locator('.navbar-logo').first().click();
  await page.waitForURL('http://localhost:4321/');
  await page.waitForTimeout(1500);

  // ========== 7. FINAL: LIGHT MODE ==========
  console.log('[7/7] Final light mode showcase...');
  await page.locator('#rail-toggle').click();
  await page.waitForTimeout(800);
  await themeBtn.click();
  await page.waitForTimeout(3500);

  await context.close();
  await browser.close();

  // Rename video
  const files = readdirSync(outDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const videoPath = join(outDir, 'demo-hq-theme.webm');
    const src = join(outDir, files[0]);
    if (src !== videoPath) {
      renameSync(src, videoPath);
    }
    const sizeMB = (statSync(videoPath).size / 1024 / 1024).toFixed(1);
    console.log(`✅ HQ Video saved: ${videoPath}`);
    console.log(`   Size: ${sizeMB} MB`);
  } else {
    console.log('⚠️ No video file found');
  }
})();
