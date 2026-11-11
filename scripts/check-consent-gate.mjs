#!/usr/bin/env node
// ═══════════════════════════════════════════════
// Guard LGPD do LifeLog — falha o build se:
//  1) o banner de consentimento sumir do BaseLayout
//  2) algum script de analytics for carregado fora do gate
//  3) a chave de consentimento for duplicada fora de src/lib/consent
//  4) as páginas legais (PT/EN) sumirem
//
// Uso: node scripts/check-consent-gate.mjs
// Exit 0 = ok | Exit 1 = quebrado (lista o motivo)
// ═══════════════════════════════════════════════
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const failures = [];
const ok = [];

function read(p) {
  return readFileSync(join(ROOT, p), 'utf8');
}
function exists(p) {
  return existsSync(join(ROOT, p));
}

// ── 1. Arquivos obrigatórios existem ─────────────
const required = [
  'src/lib/consent.ts',
  'src/lib/analytics.ts',
  'src/components/CookieBanner.astro',
  'src/pages/privacidade.astro',
  'src/pages/termos.astro',
  'src/pages/en/privacy.astro',
  'src/pages/en/terms.astro',
];
for (const f of required) {
  if (exists(f)) ok.push(`existe: ${f}`);
  else failures.push(`AUSENTE: ${f}`);
}

// ── 2. Banner montado no layout ──────────────────
const layout = read('src/layouts/BaseLayout.astro');
if (!/import\s+CookieBanner\s+from/.test(layout)) {
  failures.push('BaseLayout não importa CookieBanner');
} else ok.push('BaseLayout importa CookieBanner');

if (!/<CookieBanner[\s/>]/.test(layout)) {
  failures.push('BaseLayout não renderiza <CookieBanner />');
} else ok.push('BaseLayout renderiza <CookieBanner />');

if (!/initAnalyticsGate\s*\(/.test(layout)) {
  failures.push('BaseLayout não chama initAnalyticsGate()');
} else ok.push('BaseLayout chama initAnalyticsGate()');

// ── 3. Footer legal presente + link de reabertura ─
if (!/data-lgpd-reopen/.test(layout)) {
  failures.push('footer sem link data-lgpd-reopen (não dá para revogar consentimento)');
} else ok.push('footer tem data-lgpd-reopen');
if (!/footer-legal/.test(layout)) {
  failures.push('footer sem nav.footer-legal');
} else ok.push('footer tem nav.footer-legal');

// ── 4. Chave de consentimento em UM lugar só ─────
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      walk(full, out);
    } else if (/\.(astro|ts|tsx|js|mjs)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const KEY = 'lifelog-analytics-consent';
const srcFiles = walk(join(ROOT, 'src'));
const keyHolders = srcFiles
  .filter((f) => readFileSync(f, 'utf8').includes(KEY))
  .map((f) => relative(ROOT, f).replaceAll('\\', '/'));

const allowedKeyHolders = new Set(['src/lib/consent.ts']);
const strayKeys = keyHolders.filter((f) => !allowedKeyHolders.has(f));
if (strayKeys.length) {
  failures.push(`chave '${KEY}' duplicada em: ${strayKeys.join(', ')} (deve viver só em src/lib/consent.ts)`);
} else ok.push(`chave '${KEY}' centralizada em src/lib/consent.ts`);

// ── 5. Loader de analytics respeita o consent ────
const analytics = read('src/lib/analytics.ts');
if (!/readConsent\s*\(/.test(analytics)) {
  failures.push('analytics.ts não consulta readConsent()');
} else ok.push('analytics.ts consulta readConsent()');
if (!/=== 'accepted'/.test(analytics)) {
  failures.push("analytics.ts não exige consent === 'accepted'");
} else ok.push("analytics.ts exige consent === 'accepted'");
if (/document\.head\.appendChild/.test(analytics) && !/function loadAnalytics/.test(analytics)) {
  failures.push('analytics.ts injeta script fora de loadAnalytics()');
} else ok.push('injeção de script isolada em loadAnalytics()');

// ── 6. Nenhum script de analytics fora do gate ───
// Remove comentários antes de checar: documentar o gate não é violar o gate.
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const analyticsUrlPatterns = [
  /\bop1\.js\b/,
  /['"`]\/api\/op\b/,
  /window\.op\s*=\s*window\.op/, // criação do stub = carregar o SDK
  /<script[^>]+src=[^>]*(?:openpanel|umami|plausible|gtag|googletagmanager)/i,
  /createElement\(['"]script['"]\)[\s\S]{0,200}analytics/i,
];
// Arquivos isentos: o próprio gate (é ele que carrega) + vocabulário de tags.
// Consumidores de `window.op(...)` (ex: PostLayout) NÃO são loaders — só chamam
// o global se ele existir, e ele só existe depois do consent.
const gatedFiles = new Set(['src/lib/analytics.ts']);
const exemptFiles = new Set(['src/lib/tag-vocab.ts']);
const violations = [];
for (const f of srcFiles) {
  const rel = relative(ROOT, f).replaceAll('\\', '/');
  if (gatedFiles.has(rel) || exemptFiles.has(rel)) continue;
  if (rel.startsWith('src/lib/locales/')) continue;
  const body = stripComments(readFileSync(f, 'utf8'));
  for (const pat of analyticsUrlPatterns) {
    if (pat.test(body)) violations.push(`${rel} (${pat})`);
  }
}
if (violations.length) {
  failures.push(`analytics fora do gate: ${[...new Set(violations)].join(', ')}`);
} else ok.push('nenhum script de analytics fora de src/lib/analytics.ts');

// ── 7. Páginas legais usam BaseLayout + têm as 5 seções ──
const legalPages = [
  ['src/pages/privacidade.astro', 'privacy'],
  ['src/pages/en/privacy.astro', 'privacy'],
];
for (const [f] of legalPages) {
  const body = read(f);
  if (!/BaseLayout/.test(body)) failures.push(`${f} não usa BaseLayout`);
  const sections = (body.match(/legal__section/g) || []).length;
  if (sections < 7) failures.push(`${f} tem ${sections} seções (esperado >= 7)`);
  else ok.push(`${f}: ${sections} seções`);
}

// ── Relatório ────────────────────────────────────
if (failures.length === 0) {
  console.log('✅ LGPD ok — ' + ok.length + ' checagens passaram');
  process.exit(0);
}
console.error('❌ LGPD gate quebrado — ' + failures.length + ' falha(s):');
for (const f of failures) console.error('   • ' + f);
process.exit(1);
