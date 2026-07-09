import { test } from '@playwright/test';

test('local thumb CSS', async ({ page }) => {
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => document.querySelector('#rail-theme')?.click());
  await page.waitForTimeout(1000);
  
  const info = await page.evaluate(() => {
    const thumb = document.querySelector('.rail-theme-thumb');
    if (!thumb) return { error: 'no thumb' };
    const cs = getComputedStyle(thumb);
    const rules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.cssText.includes('rail-theme-thumb')) {
            rules.push(rule.cssText.substring(0, 200));
          }
        }
      } catch(e) {}
    }
    return {
      transform: cs.transform,
      left: cs.left,
      rules: rules,
      dataTheme: document.documentElement.getAttribute('data-theme'),
    };
  });
  
  for (const [k, v] of Object.entries(info)) {
    console.log(`${k}: ${JSON.stringify(v)}`);
  }
});
