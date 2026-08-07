#!/usr/bin/env node
/**
 * 🐛 Bug Hunter — LifeLog (06/08/2026)
 * Auditoria de renderização real em produção.
 * Blog Astro SSG estático — sem auth, sem login.
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FINDINGS_DIR = resolve(ROOT, 'docs/agents/qualidade/bug-hunter/findings');
const REPORT_PATH = resolve(FINDINGS_DIR, `audit-${new Date().toISOString().split('T')[0]}.json`);
const PREVIEW = 'https://lifelog-sepia.vercel.app';

// Rotas do LifeLog (blog SSG estático, i18n PT/EN)
// NOTA: /tags e /en/tags NÃO existem — TagCloud linka pra busca (?q=) no /arquivo.
const ROUTES = ['/', '/en/', '/arquivo', '/en/archive', '/sobre', '/en/about'];

// Checagens por rota
const ROUTE_RENDER_CHECKS = {
  '/': [
    { id: 'root-mounted', desc: 'Astro renderizou', check: (page) => page.evaluate(() => {
        const main = document.querySelector('main') || document.querySelector('#app') || document.body;
        return { ok: main && main.innerHTML.length > 100, detail: `main len=${main?.innerHTML?.length || 0}` };
      }) },
    { id: 'has-cards', desc: 'Cards de post na timeline', check: (page) => page.evaluate(() => {
        const body = document.body?.innerText || '';
        const hasContent = body.length > 200 && /projeto|feat|fix|release|post|v[\d.]+/i.test(body);
        return { ok: hasContent, detail: `body ${body.length} chars` };
      }) },
  ],
  '/en/': [
    { id: 'i18n-en', desc: 'Timeline em inglês', check: (page) => page.evaluate(() => {
        const body = document.body?.innerText || '';
        const isEnglish = /project|feature|fix|release|version/i.test(body);
        return { ok: isEnglish, detail: body.length > 200 ? `body ${body.length} chars (EN)` : 'body muito curto' };
      }) },
  ],
};

// Rota serve HTML (fetch com Accept: text/html — simula navegação real)
async function checkRouteServesHtml(page) {
  return page.evaluate(async () => {
    try {
      const res = await fetch(window.location.href, {
        method: 'GET', credentials: 'include',
        headers: { 'Accept': 'text/html' },
      });
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      const statusOk = res.status >= 200 && res.status < 300;
      return { ok: statusOk && ct.includes('text/html'), detail: `content-type=${ct || 'none'} status=${res.status}` };
    } catch (e) {
      return { ok: false, detail: `fetch falhou: ${e.message}` };
    }
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = {
    timestamp: new Date().toISOString(), url: PREVIEW, duration: 0,
    routes: {}, consoleErrors: [], networkErrors: [], navigationFailures: [],
    passed: 0, failed: 0, loginOk: true,
  };
  page.on('console', msg => {
    if (msg.type() === 'error') results.consoleErrors.push({ text: msg.text().substring(0, 200) });
  });
  page.on('response', res => {
    if (res.status() >= 400) results.networkErrors.push({ url: res.url().substring(0, 200), status: res.status() });
  });
  const startTime = Date.now();

  try {
    console.log('[1/3] Varrendo rotas...');
    for (const route of ROUTES) {
      await new Promise(r => setTimeout(r, 2000)); // delay gentil entre rotas
      const rr = { url: `${PREVIEW}${route}` };
      try {
        await page.goto(`${PREVIEW}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        rr.title = await page.title().catch(() => 'no-title');
        rr.contentSize = await page.evaluate(() => document.body?.innerHTML?.length || 0);
        rr.servesHtml = await checkRouteServesHtml(page);
        const checks = ROUTE_RENDER_CHECKS[route] || ROUTE_RENDER_CHECKS['/'] || [];
        rr.renderChecks = [];
        for (const rc of checks) {
          try {
            const r = await rc.check(page);
            rr.renderChecks.push({ id: rc.id, desc: rc.desc, ok: r.ok, detail: r.detail });
            if (!r.ok) { results.failed++; results.navigationFailures.push({ route, error: `[render] ${rc.desc}: ${r.detail}` }); }
          } catch (err) {
            rr.renderChecks.push({ id: rc.id, desc: rc.desc, ok: false, detail: err.message?.substring(0, 100) });
            results.failed++;
          }
        }
        if (!rr.servesHtml.ok) { results.failed++; results.navigationFailures.push({ route, error: `[html] ${rr.servesHtml.detail}` }); }
        results.passed++;
        results.routes[route] = rr;
        console.log(`  ${route}: ✅ (${rr.contentSize}b)`);
      } catch (err) {
        rr.error = err.message?.substring(0, 200);
        results.failed++;
        results.navigationFailures.push({ route, error: err.message?.substring(0, 200) });
        console.log(`  ${route}: ❌`);
      }
    }

    results.duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n📊 RESUMO FINAL:\n    ⏱️  ${results.duration}s\n    ✅ ${results.passed} checks OK\n    ❌ ${results.failed} checks com erro\n    🐛 ${results.consoleErrors.length} console errors\n    🚫 ${results.navigationFailures.length} falhas`);
    mkdirSync(FINDINGS_DIR, { recursive: true });
    writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('❌ Bug Hunter FALHOU:', err.message);
  } finally {
    await browser.close();
  }
}
run();