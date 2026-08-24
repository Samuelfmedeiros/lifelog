// Screenshot final de PRODUÇÃO (vercel) — /arquivo light + post dark
const { chromium } = require('@playwright/test');
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:1280,height:800}});
  const page=await ctx.newPage();
  await page.addInitScript((t)=>{ try{ localStorage.setItem('lifelog-theme', t); localStorage.setItem('lifelog-palette','purple') }catch{} }, 'light');
  await page.goto('https://lifelog-sepia.vercel.app/arquivo',{waitUntil:'networkidle'});
  await page.waitForTimeout(1000);
  await page.screenshot({path:'/home/samuel/projetos/lifelog/prod-arquivo-light.png', fullPage:false});
  // post dark — code block
  await page.addInitScript((t)=>{ try{ localStorage.setItem('lifelog-theme', t) }catch{} }, 'dark');
  await page.goto('https://lifelog-sepia.vercel.app/post/testes-e2e-com-playwright-a-virada-de-qualidade/',{waitUntil:'networkidle'});
  await page.waitForTimeout(1200);
  await page.evaluate(()=>{ const el=document.querySelector('.astro-code'); if(el) el.scrollIntoView({block:'center'}) });
  await page.waitForTimeout(800);
  await page.screenshot({path:'/home/samuel/projetos/lifelog/prod-post-dark.png', fullPage:false});
  console.log('screenshots prod OK');
  await b.close();
})();