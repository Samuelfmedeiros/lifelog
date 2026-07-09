import { test } from '@playwright/test';

test('navbar light mode FINAL', async ({ page }) => {
  await page.goto('https://lifelog-sepia.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const before = await page.evaluate(() => {
    const nav = document.querySelector('.navbar');
    const cs = nav ? getComputedStyle(nav) : null;
    return {
      dataTheme: document.documentElement.getAttribute('data-theme'),
      navbarBg: cs?.backgroundColor || 'no-nav',
    };
  });
  console.log(`BEFORE: theme=${before.dataTheme} navbar=${before.navbarBg}`);
  
  // Click toggle to switch theme
  await page.evaluate(() => {
    const btn = document.querySelector('#rail-theme');
    if (btn) (btn as HTMLElement).click();
  });
  await page.waitForTimeout(1500);
  
  const after = await page.evaluate(() => {
    const nav = document.querySelector('.navbar');
    const cs = nav ? getComputedStyle(nav) : null;
    const thumb = document.querySelector('.rail-theme-thumb');
    const thumbTransform = thumb ? getComputedStyle(thumb).transform : 'no-thumb';
    return {
      dataTheme: document.documentElement.getAttribute('data-theme'),
      navbarBg: cs?.backgroundColor || 'no-nav',
      thumbTransform,
      bgVar: getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim(),
    };
  });
  console.log(`AFTER:  theme=${after.dataTheme} navbar=${after.navbarBg} thumb=${after.thumbTransform} bg=${after.bgVar}`);
  
  if (after.navbarBg.includes('255, 255, 255') || after.navbarBg.includes('rgba(255')) {
    console.log('✅ NAVBAR LIGHT MODE!');
  } else {
    console.log('❌ Navbar still dark');
  }
});
