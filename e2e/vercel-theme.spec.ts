import { test } from '@playwright/test';

test('inspect thumb CSS on Vercel', async ({ page }) => {
  await page.goto('https://lifelog-sepia.vercel.app/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  // Click toggle to light
  await page.evaluate(() => document.querySelector('#rail-theme')?.click());
  await page.waitForTimeout(1000);
  
  // Inspect all CSS rules affecting the thumb
  const info = await page.evaluate(() => {
    const thumb = document.querySelector('.rail-theme-thumb');
    if (!thumb) return { error: 'no thumb' };
    
    const cs = getComputedStyle(thumb);
    const rules = [];
    
    // Scan all stylesheets for .rail-theme-thumb rules
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          const css = rule.cssText;
          if (css.includes('rail-theme-thumb') || css.includes('rail-theme')) {
            rules.push(css.substring(0, 200));
          }
        }
      } catch(e) {
        rules.push(`[CORS: ${sheet.href}]`);
      }
    }
    
    return {
      transform: cs.transform,
      left: cs.left,
      position: cs.position,
      top: cs.top,
      width: cs.width,
      htmlAttr: thumb.outerHTML.substring(0, 300),
      stylesheetRules: rules,
      dataTheme: document.documentElement.getAttribute('data-theme'),
    };
  });
  
  console.log(JSON.stringify(info, null, 2));
});
