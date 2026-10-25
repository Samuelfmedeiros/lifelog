#!/usr/bin/env node
/**
 * validate-saidas-utm.mjs — gate de amarração (REGRA-AMARRACAO).
 *
 * Varre o build e falha se existir QUALQUER saída para um ativo do Samuel sem
 * utm_source. Nasceu do pedido do @moedas (24/10): o banco da loja mostrava linhas
 * humanas vindas de lifelog.seu.pet sem tag — o form de captura (/assinar) era o
 * único link que escapava do UTM. Guard no build impede a recaída: link sem tag não
 * é medível e some do funil.
 *
 * Uso: node scripts/validate-saidas-utm.mjs [dist]
 *      npm run build -- --outDir dist-verify   (o guard entende --outDir também;
 *      sem isso ele recebia a flag como se fosse diretório e falhava com ENOENT)
 * Exit: 0 tudo taggeado, 1 achou saída sem UTM.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function diretorioDosArgs(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--outDir' || arg === '--out-dir') return argv[i + 1] || 'dist';
    if (arg.startsWith('--outDir=')) return arg.slice('--outDir='.length);
    if (!arg.startsWith('-')) return arg;
  }
  return 'dist';
}

const DIST = diretorioDosArgs(process.argv.slice(2));
// Host EXATO (nunca substring: 'seu.pet' casaria com lifelog.seu.pet, que é o próprio site).
const ATIVOS = new Set([
  'skills.seu.pet',
  'portifolio.seu.pet',
  'seu.pet',
  'arachne.seu.pet',
  'focinho.seu.pet',
  'safmarket.seu.pet',
]);

/** Todas as URLs de saída encontradas no HTML (href e action). */
function saidas(html) {
  const urls = [];
  for (const m of html.matchAll(/(?:href|action)="(https?:\/\/[^"]+)"/g)) {
    const url = m[1].replace(/&amp;/g, '&');
    let host;
    try {
      host = new URL(url).hostname;
    } catch {
      continue;
    }
    if (ATIVOS.has(host)) urls.push(url);
  }
  return urls;
}

function* paginas(dir) {
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    const info = statSync(caminho);
    if (info.isDirectory()) yield* paginas(caminho);
    else if (entrada.endsWith('.html')) yield caminho;
  }
}

let total = 0;
const semTag = [];

try {
  for (const pagina of paginas(DIST)) {
    const html = readFileSync(pagina, 'utf8');
    for (const url of saidas(html)) {
      total += 1;
      if (!/[?&]utm_source=/.test(url)) semTag.push(`${pagina} -> ${url}`);
    }
  }
} catch (erro) {
  console.error(`[saidas-utm] não consegui ler ${DIST}: ${erro.message}`);
  process.exit(1);
}

if (total === 0) {
  console.error(`[saidas-utm] FALHA: nenhuma saída encontrada em ${DIST} — build vazio ou seletor quebrado`);
  process.exit(1);
}

if (semTag.length > 0) {
  console.error(`[saidas-utm] FALHA: ${semTag.length} de ${total} saídas sem utm_source`);
  for (const linha of semTag.slice(0, 10)) console.error(`  ${linha}`);
  process.exit(1);
}

console.log(`[saidas-utm] OK: ${total} saídas, todas com utm_source`);
