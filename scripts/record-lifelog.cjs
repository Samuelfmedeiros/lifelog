const { chromium } = require('/home/samuel/projetos/lifelog/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: '/tmp/lifelog-video', size: { width: 1440, height: 900 } }
  });
  const page = await context.newPage();

  console.log('Recording...');

  // 1. Home PT
  await page.goto('https://lifelog-sepia.vercel.app', { waitUntil: 'networkidle' });
  console.log('✓ Home PT');
  await page.waitForTimeout(2000);

  // 2. Archive with TagCloud
  await page.goto('https://lifelog-sepia.vercel.app/arquivo', { waitUntil: 'networkidle' });
  console.log('✓ Archive PT');
  await page.waitForTimeout(2000);

  // 3. Filter by tag
  await page.goto('https://lifelog-sepia.vercel.app/?q=arachne', { waitUntil: 'networkidle' });
  console.log('✓ Filter by tag');
  await page.waitForTimeout(1500);

  // 4. Post
  await page.goto('https://lifelog-sepia.vercel.app/post/lifelog-ritmo-diario-capa-ai', { waitUntil: 'networkidle' });
  console.log('✓ Post PT');
  await page.waitForTimeout(2000);

  // 5. English
  await page.goto('https://lifelog-sepia.vercel.app/en/', { waitUntil: 'networkidle' });
  console.log('✓ Home EN');
  await page.waitForTimeout(2000);

  await browser.close();

  // Find the video file
  const fs = require('fs');
  const files = fs.readdirSync('/tmp/lifelog-video');
  console.log('Video file(s):', files.join(', '));
})();
