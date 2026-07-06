// Record theme toggle + post click demo video
// Uses @playwright/test for Chromium access (async module)

import { chromium } from '@playwright/test';
import { writeFileSync, readdirSync, renameSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    recordVideo: {
      dir: outDir,
      size: { width: 1280, height: 800 },
    },
  });

  const page = await context.newPage();

  // ========== 1. HOMEPAGE — DARK MODE ==========
  console.log('📄 Opening homepage...');
  await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // ========== 2. SCROLL TO SEE POSTS ==========
  console.log('📜 Scrolling posts...');
  await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // ========== 3. OPEN POPOVER ==========
  console.log('🎨 Opening palette popover...');
  const toggle = page.locator('#rail-toggle');
  await toggle.hover();
  await page.waitForTimeout(400);
  await toggle.click();
  await page.waitForTimeout(500);

  // ========== 4. SELECT DIFFERENT PALETTE ==========
  console.log('🟢 Selecting Emerald palette...');
  await page.locator('.rail-dot[data-palette="emerald"]').click();
  await page.waitForTimeout(600);
  console.log('🩵 Selecting Cyan palette...');
  await page.locator('.rail-dot[data-palette="cyan"]').click();
  await page.waitForTimeout(400);
  console.log('🟣 Back to Purple...');
  await page.locator('.rail-dot[data-palette="purple"]').click();
  await page.waitForTimeout(400);

  // ========== 5. TOGGLE TO LIGHT MODE (circlewip) ==========
  console.log('☀️ Light mode toggle...');
  const themeSwitch = page.locator('#rail-theme');
  await themeSwitch.click({ position: { x: 10, y: 14 } });
  await page.waitForTimeout(2000); // wait for circle-wipe + particle re-init

  // ========== 6. SCROLL IN LIGHT MODE ==========
  console.log('📜 Scrolling light mode...');
  await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // ========== 7. TOGGLE BACK TO DARK ==========
  console.log('🌙 Back to dark...');
  await themeSwitch.click({ position: { x: 40, y: 14 } });
  await page.waitForTimeout(2000);

  // ========== 8. CLOSE POPOVER ==========
  console.log('🚪 Closing popover...');
  await toggle.click();
  await page.waitForTimeout(500);

  // ========== 9. CLICK FIRST POST ==========
  console.log('📝 Opening first post...');
  const firstCardLink = page.locator('.post-card a').first();
  await firstCardLink.click();
  await page.waitForURL('**/post/**');
  await page.waitForTimeout(1500);

  // ========== 10. SCROLL POST ==========
  console.log('📜 Scrolling post...');
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // ========== 11. FINALE: LIGHT MODE ==========
  console.log('☀️ Finale — light mode showcase...');
  await page.locator('#rail-toggle').click();
  await page.waitForTimeout(400);
  await themeSwitch.click();
  await page.waitForTimeout(2000);

  await context.close();
  await browser.close();

  // ========== 12. ENCODE WITH MINTERPOLATE ==========
  console.log('🎬 Encoding with minterpolate 30fps...');
  const files = readdirSync(outDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const rawVideo = join(outDir, files[0]);
    // Step A: extract clean webm
    const inputRaw = join(outDir, 'demo-raw.webm');
    renameSync(rawVideo, inputRaw);
    // Step B: minterpolate + CRF15
    const output = join(outDir, 'demo-lifelog-theme-hq.mp4');
    execSync(
      `ffmpeg -y -i "${inputRaw}" \
        -vf "minterpolate=fps=30:mi_mode=mci,scale=1280:800:flags=lanczos" \
        -c:v libx264 -crf 15 -preset slow \
        -pix_fmt yuv420p -movflags +faststart \
        "${output}"`,
      { stdio: 'inherit' }
    );
    // Step C: delete intermediate raw
    // execSync(`rm "${inputRaw}"`);
    const sizeMB = (statSync(output).size / 1024 / 1024).toFixed(1);
    console.log(`✅ Final video: ${output}`);
    console.log(`   Size: ${sizeMB} MB`);
  } else {
    console.log('⚠️ No video file found');
  }
})();
