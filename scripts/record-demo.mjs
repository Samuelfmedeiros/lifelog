import { chromium } from 'playwright';

const URL = 'https://lifelog-sepia.vercel.app';
const OUTPUT = '/tmp/lifelog-demo.mp4';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: '/tmp/', size: { width: 1280, height: 800 } }
  });
  const page = await context.newPage();

  // 1. Homepage — full view
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Scroll slowly to show posts
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(800);

  // 2. Theme toggle — dark mode
  const themeBtn = await page.$('#rail-theme');
  if (themeBtn) { await themeBtn.click(); await page.waitForTimeout(2500); }

  // 3. Color palette selector — open and pick
  const colorBtn = await page.$('#rail-color');
  if (colorBtn) { await colorBtn.click(); await page.waitForTimeout(1000); }
  
  const synthwave = await page.$('.rail-dot[data-palette="synthwave"]');
  if (synthwave) { await synthwave.click(); await page.waitForTimeout(2000); }

  // 4. Back to light theme
  if (themeBtn) { await themeBtn.click(); await page.waitForTimeout(2000); }

  // 5. Filter by project (Arachne)
  const filterArachne = await page.$('[data-filter-project="arachne"]');
  if (filterArachne) { await filterArachne.click(); await page.waitForTimeout(2000); }

  // Reset filter
  const filterAll = await page.$('[data-filter-project="all"]');
  if (filterAll) { await filterAll.click(); await page.waitForTimeout(800); }

  // 6. Archive page
  await page.goto(URL + '/arquivo/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 7. Click first post to read
  const firstPost = await page.$('a[href^="/post/"]');
  if (firstPost) { await firstPost.click(); await page.waitForTimeout(3000); }
  // Scroll a bit in the post
  await page.evaluate(() => window.scrollBy({ top: 300, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  // 8. About page
  await page.goto(URL + '/sobre/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 9. English version
  await page.goto(URL + '/en/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Scroll to see EN posts
  await page.evaluate(() => window.scrollBy({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(1000);

  await browser.close();
  
  // Rename video
  const fs = await import('fs');
  const files = fs.readdirSync('/tmp/').filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const latest = files.sort().reverse()[0];
    fs.renameSync('/tmp/' + latest, OUTPUT);
    console.log('✅ Video saved to', OUTPUT);
    console.log('Size:', fs.statSync(OUTPUT).size);
  } else {
    console.log('❌ No video file found');
  }
})();
