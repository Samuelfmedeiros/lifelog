#!/usr/bin/env node
// GATE DE CAPAS — roda ANTES do astro build (ver package.json).
// Regra: TODO .mdx em src/content/posts (PT e EN) precisa de `cover:` no
// frontmatter apontando pra arquivo que existe em public/covers/.
//
// Comportamento:
// - cover ausente mas public/covers/<slug>.webp existe  -> AUTO-FIX (insere a linha) e segue
// - cover aponta pra arquivo inexistente mas <slug>.webp existe -> AUTO-FIX (corrige o caminho)
// - sem cover e sem arquivo (ou caminho morto sem substituto) -> FALHA o build (exit 1)
//
// Criado 23/08/2026: post WCAG subiu sem capa porque o gerador criou o .webp
// mas esqueceu a linha `cover:` no frontmatter — e nada no pipeline pegava.

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const COVERS = join(ROOT, 'public', 'covers');

function fmBody(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : null;
}

function fmGet(body, key) {
  const line = body.split('\n').find((l) => l.trim().startsWith(key + ':'));
  if (!line) return '';
  return line.split(':').slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
}

function detectEol(text) {
  const i = text.indexOf('\n');
  return i > 0 && text[i - 1] === '\r' ? '\r\n' : '\n';
}

function fmBounds(lines) {
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      n++;
      if (n === 2) return i; // índice da linha que fecha o frontmatter
    }
  }
  return -1;
}

function insertCoverLine(text, coverValue) {
  const eol = detectEol(text);
  const lines = text.split(eol);
  const end = fmBounds(lines);
  if (end === -1) throw new Error('frontmatter incompleto');
  lines.splice(end, 0, `cover: ${coverValue}`);
  return lines.join(eol);
}

function replaceCoverLine(text, coverValue) {
  const eol = detectEol(text);
  const lines = text.split(eol);
  const end = fmBounds(lines);
  if (end === -1) throw new Error('frontmatter incompleto');
  for (let i = 0; i < end; i++) {
    if (lines[i].trim().startsWith('cover:')) {
      lines[i] = `cover: ${coverValue}`;
      break;
    }
  }
  return lines.join(eol);
}

const fixed = [];
const failed = [];

for (const [prefix, dir] of [
  ['', POSTS],
  ['en/', join(POSTS, 'en')],
]) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    continue; // pasta en/ pode não existir em forks frescos
  }
  for (const fn of entries.filter((f) => f.endsWith('.mdx')).sort()) {
    const abs = join(dir, fn);
    const slug = fn.replace(/\.mdx$/, '');
    const label = `${prefix}${slug}`;
    let text = readFileSync(abs, 'utf-8');
    const body = fmBody(text);
    if (!body) {
      failed.push(`${label}: frontmatter ausente/malformado`);
      continue;
    }
    const cover = fmGet(body, 'cover');

    if (!cover) {
      const guess = `/covers/${slug}.webp`;
      if (existsSync(join(COVERS, `${slug}.webp`))) {
        text = insertCoverLine(text, guess);
        writeFileSync(abs, text);
        fixed.push(`${label}: cover inserido -> ${guess}`);
      } else {
        failed.push(
          `${label}: sem "cover:" e public/covers/${slug}.webp nao existe ` +
            `(gere com: python3 scripts/generate-cover.py ${slug})`,
        );
      }
      continue;
    }

    const rel = cover.startsWith('/') ? cover.slice(1) : cover;
    const target = rel.startsWith('covers/')
      ? join(COVERS, rel.slice('covers/'.length))
      : join(ROOT, rel);
    if (!existsSync(target)) {
      const guess = `/covers/${slug}.webp`;
      if (existsSync(join(COVERS, `${slug}.webp`))) {
        text = replaceCoverLine(text, guess);
        writeFileSync(abs, text);
        fixed.push(`${label}: caminho morto "${cover}" corrigido -> ${guess}`);
      } else {
        failed.push(
          `${label}: cover aponta pra "${cover}" que nao existe (nem public/covers/${slug}.webp)`,
        );
      }
    }
  }
}

if (fixed.length) {
  for (const f of fixed) console.log(`[covers] AUTO-FIX: ${f}`);
}

// ---- AUDITORIA DE ASPECTO 21/9 (07/11/2026) ----
// O gate antigo só olhava existência: capa quadrada (1024x1024) passava e
// quebrava o card do blog (PostCard.astro corta em 21/9). Regra nova:
// contorna as capas FORA de 21/9 e falha se a contagem CRESCER sobre o
// baseline (acervo legado fica registrado, regressão nova bloqueia).
// `--strict` falha em qualquer desvio — usado no cron/CI de auditoria.
function dimsOf(abs) {
  let d;
  try {
    d = readFileSync(abs).subarray(0, 4096);
  } catch {
    return null;
  }
  if (d.length >= 12 && d[4] === 0x66 && d[5] === 0x74 && d[6] === 0x79 && d[7] === 0x70) {
    const i = d.indexOf(Buffer.from('ispe'));
    if (i < 0 || i + 16 > d.length) return null;
    return { w: d.readUInt32BE(i + 8), h: d.readUInt32BE(i + 12) };
  }
  if (d.length < 30 || d[0] !== 0x52 || d[1] !== 0x49) return null; // 'RI'
  const cc = d.toString('latin1', 12, 16);
  if (cc === 'VP8X') return { w: 1 + d.readUIntLE(24, 3), h: 1 + d.readUIntLE(27, 3) };
  if (cc === 'VP8 ') return { w: d.readUInt16LE(26) & 0x3fff, h: d.readUInt16LE(28) & 0x3fff };
  if (cc === 'VP8L') {
    const b = d[21] | (d[22] << 8) | (d[23] << 16) | (d[24] << 24);
    return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
  }
  return null;
}
const rel = (p) => relative(ROOT, p);
const strict = process.argv.includes('--strict');
const vistos = new Map();
for (const [prefix, dir] of [
  ['', POSTS],
  ['en/', join(POSTS, 'en')],
]) {
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    continue;
  }
  for (const fn of entries.filter((f) => f.endsWith('.mdx'))) {
    const body = fmBody(readFileSync(join(dir, fn), 'utf-8'));
    const cover = body ? fmGet(body, 'cover') : '';
    if (!cover) continue;
    // `/covers/x.webp` no frontmatter = servido de public/ -> public/covers/x.webp
    const _rel = cover.startsWith('/') ? cover.slice(1) : cover;
    const abs = _rel.startsWith('covers/')
      ? join(COVERS, _rel.slice('covers/'.length))
      : join(ROOT, _rel);
    if (!vistos.has(abs)) vistos.set(abs, `${prefix}${fn.replace(/\.mdx$/, '')}`);
  }
}
const fora = [];
for (const [abs, label] of vistos) {
  const d = dimsOf(abs);
  if (!d || d.h === 0) {
    fora.push(`${label}: ILEGIVEL ${rel(abs)}`);
    continue;
  }
  if (Math.abs(d.w / d.h - 21 / 9) > 0.05) {
    fora.push(`${label}: ${d.w}x${d.h} (ar ${(d.w / d.h).toFixed(2)}) ${rel(abs)}`);
  }
}
const nFora = fora.length;
const BASELINE = join(COVERS, '_aspect-baseline.json');
const record = process.argv.includes('--record-baseline');
// caminhos relativos (public/covers/...) fora de 21/9 nesta corrida
const ofensores = [...new Set(
  fora
    .map((f) => {
      const m = f.match(/(public\/covers\/\S+)$/);
      return m ? m[1] : f;
    })
    .filter((p) => p.startsWith('public/covers/')),
)];
let baseSet = new Set();
try {
  const base = JSON.parse(readFileSync(BASELINE, 'utf-8'));
  const list = Array.isArray(base) ? base : base.legacy || [];
  for (const p of list) {
    if (typeof p === 'string' && p) baseSet.add(p);
  }
} catch {}
if (record || baseSet.size === 0) {
  const payload = {
    nota: 'acervo legado fora de 21/9, por caminho. Capa NOVA fora de 21/9 falha o build; o que esta aqui nao falha. Regerar com --record-baseline.',
    atualizado: new Date().toISOString().slice(0, 10),
    total: ofensores.length,
    legacy: ofensores.sort(),
  };
  writeFileSync(BASELINE, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    record
      ? `[covers] ASPECTO: baseline regravada com ${ofensores.length} capa(s) fora de 21/9.`
      : `[covers] ASPECTO: baseline criada com ${ofensores.length} capa(s) fora de 21/9 (nao bloqueia).`,
  );
} else {
  const novos = ofensores.filter((p) => !baseSet.has(p));
  if (strict && novos.length > 0) {
    console.error(`\n[covers] ASPECTO (--strict): build bloqueado — ${novos.length} capa(s) fora de 21/9:`);
    for (const f of novos.slice(0, 40)) console.error(`[covers]   - ${f}`);
    process.exit(1);
  }
  if (novos.length > 0) {
    console.error(
      `\n[covers] ASPECTO: REGRESSAO — ${novos.length} capa(s) fora de 21/9 que nao estavam no acervo legado:`,
    );
    console.error(`[covers]   acervo legado: ${baseSet.size} capa(s). Post/cover novo precisa ser 21/9.`);
    for (const f of novos.slice(0, 40)) console.error(`[covers]   - ${f}`);
    process.exit(1);
  }
  console.log(
    `[covers] ASPECTO: ${nFora} capa(s) fora de 21/9, todas no acervo legado (${baseSet.size}) — sem regressao.`,
  );
}

if (failed.length) {
  console.error(`\n[covers] GATE: build bloqueado — ${failed.length} post(s) sem capa valida:`);
  for (const f of failed) console.error(`[covers]   - ${f}`);
  process.exit(1);
}
console.log(`[covers] OK: capas validas em todos os posts (${fixed.length} auto-corrigido(s)).`);
