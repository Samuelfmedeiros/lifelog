const { chromium } = require('@playwright/test');

const URL = process.env.URL || 'https://lifelog-sepia.vercel.app';
const OUTPUT = '/tmp/lifelog-demo.mp4';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: '/tmp/', size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  console.log('Starting demo recording...');

  // 1. Homepage
  console.log('1/9 Homepage');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // 2. Theme toggle
  console.log('2/9 Theme toggle');
  const themeBtn = await page.$('#rail-theme');
  if (themeBtn) { await themeBtn.click(); await page.waitForTimeout(3000); }

  // 3. Color palette
  console.log('3/9 Color palette');
  const colorBtn = await page.$('#rail-color');
  if (colorBtn) { await colorBtn.click(); await page.waitForTimeout(1500); }
  const synthwave = await page.$('.rail-dot[data-palette="synthwave"]');
  if (synthwave) { await synthwave.click(); await page.waitForTimeout(2500); }

  // 4. Back to light
  if (themeBtn) { await themeBtn.click(); await page.waitForTimeout(2500); }

  // 5. Filter by Arachne
  console.log('5/9 Filter');
  const arachnePill = await page.$('[data-filter-project="arachne"]');
  if (arachnePill) { await arachnePill.click(); await page.waitForTimeout(2000); }
  const allPill = await page.$('[data-filter-project="all"]');
  if (allPill) { await allPill.click(); await page.waitForTimeout(1000); }

  // 6. Archive
  console.log('6/9 Archive');
  await page.goto(URL + '/arquivo/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // 7. Post
  console.log('7/9 Post');
  const firstPost = await page.$('a[href^="/post/"]');
  if (firstPost) { await firstPost.click(); await page.waitForTimeout(3500); }
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(1500);

  // 8. About
  console.log('8/9 About');
  await page.goto(URL + '/sobre/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // 9. EN
  console.log('9/9 English');
  await page.goto(URL + '/en/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(2000);

  await browser.close();
  
  // Find and rename the video
  const fs = require('fs');
  const files = fs.readdirSync('/tmp/').filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const latest = files.sort((a,b) => fs.statSync('/tmp/'+b).mtime - fs.statSync('/tmp/'+a).mtime)[0];
    fs.renameSync('/tmp/' + latest, OUTPUT);
    console.log('✅ Video saved:', OUTPUT);
    console.log('Size:', (fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1), 'MB');
  } else {
    console.log('❌ No video file created');
  }
})();
