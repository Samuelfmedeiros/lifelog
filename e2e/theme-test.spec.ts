import { test } from '@playwright/test';

test('analyze theme', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  let theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('data-theme:', theme);
  
  let toggleExists = await page.evaluate(() => !!document.getElementById('rail-theme'));
  console.log('toggle exists:', toggleExists);
  
  let railExists = await page.evaluate(() => !!document.getElementById('theme-rail'));
  console.log('rail exists:', railExists);
  
  // Try clicking by querySelector
  let clicked = await page.evaluate(() => {
    const btn = document.querySelector('#rail-theme');
    if (!btn) return 'no-btn';
    btn.click();
    return 'clicked';
  });
  console.log('click result:', clicked);
  
  await page.waitForTimeout(1000);
  
  theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  console.log('after click data-theme:', theme);
  
  let icon = await page.evaluate(() => document.querySelector('.rail-theme-icon')?.textContent);
  console.log('icon text:', icon);
});
