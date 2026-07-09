import { test } from '@playwright/test';

test('mobile theme check', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
  await page.goto('https://lifelog-sepia.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  
  // Check if the is:global styles are in the page
  const styles = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    let foundLightNavbar = false;
    for (const sheet of sheets) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        for (const rule of rules) {
          if (rule.cssText?.includes('[data-theme="light"]')) {
            foundLightNavbar = true;
            break;
          }
        }
      } catch(e) {}
    }
    return {
      numStyleSheets: sheets.length,
      hasLightThemeRules: foundLightNavbar,
      dataTheme: document.documentElement.getAttribute('data-theme'),
    };
  });
  console.log('Styles:', JSON.stringify(styles, null, 2));
  
  // Try clicking toggle
  const before = await page.evaluate(() => {
    const nav = document.querySelector('.navbar');
    const cs = nav ? getComputedStyle(nav) : null;
    return { theme: document.documentElement.getAttribute('data-theme'), navbar: cs?.backgroundColor };
  });
  console.log('BEFORE click:', JSON.stringify(before));
  
  // Click the toggle button
  await page.evaluate(() => {
    const toggle = document.querySelector('#rail-toggle');
    if (toggle) (toggle as HTMLElement).click();
  });
  await page.waitForTimeout(500);
  
  const middle = await page.evaluate(() => {
    const rail = document.getElementById('theme-rail');
    return { open: rail?.classList.contains('open') };
  });
  console.log('Popover open:', middle.open);
  
  // Click the theme switch
  await page.evaluate(() => {
    const themeBtn = document.querySelector('#rail-theme');
    if (themeBtn) (themeBtn as HTMLElement).click();
  });
  await page.waitForTimeout(1500);
  
  const after = await page.evaluate(() => {
    const nav = document.querySelector('.navbar');
    const cs = nav ? getComputedStyle(nav) : null;
    const thumb = document.querySelector('.rail-theme-thumb');
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      navbar: cs?.backgroundColor,
      thumbTransform: thumb ? getComputedStyle(thumb).transform : null,
      bgVar: getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim(),
    };
  });
  console.log('AFTER click:', JSON.stringify(after, null, 2));
  
  if (after.navbar?.includes('255, 255, 255')) {
    console.log('✅ NAVBAR LIGHT!');
  } else {
    console.log('❌ Navbar ainda escura:', after.navbar);
  }
});
