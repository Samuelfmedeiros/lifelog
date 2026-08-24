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
import { join, dirname } from 'node:path';
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
if (failed.length) {
  console.error(`\n[covers] GATE: build bloqueado — ${failed.length} post(s) sem capa valida:`);
  for (const f of failed) console.error(`[covers]   - ${f}`);
  process.exit(1);
}
console.log(`[covers] OK: capas validas em todos os posts (${fixed.length} auto-corrigido(s)).`);
