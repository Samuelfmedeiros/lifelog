#!/usr/bin/env node
// scripts/gen-ocultos.mjs — Gera api/ocultos-data.mjs com os posts hidden
// Rodado no build: node scripts/validate-covers.mjs && node scripts/gen-ocultos.mjs && astro build

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
const OUTPUT = join(ROOT, 'api', 'ocultos-data.mjs');

function parseFrontmatter(raw) {
  const fm = {};
  const lines = raw.split('\n');
  for (const line of lines) {
    const m = line.match(/^(\w+):\s*(.+)/);
    if (m) {
      let val = m[2].trim();
      // Remove quotes
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      }
      // Parse booleans
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      fm[m[1]] = val;
    }
  }
  return fm;
}

function walkDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.isFile() && extname(entry.name) === '.mdx') {
      files.push(full);
    }
  }
  return files;
}

function collectHidden() {
  const posts = [];
  const files = walkDir(POSTS_DIR);
  
  for (const file of files) {
    const raw = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(raw);
    
    if (!fm.hidden) continue;
    
    const rel = relative(POSTS_DIR, file);
    const parts = rel.split(/[/\\]/);
    const lang = parts.length > 1 && parts[0] === 'en' ? 'en' : 'pt';
    const slug = (lang === 'en' ? parts.slice(1) : parts).join('/').replace(/\.mdx$/, '');
    
    // Extract content (after frontmatter)
    const contentStart = raw.indexOf('---', 3); // skip first ---
    const content = contentStart !== -1 
      ? raw.slice(contentStart + 3).trim().slice(0, 30000)
      : '';
    
    posts.push({
      path: rel,
      slug,
      lang,
      title: fm.title || slug,
      date: fm.pubDate || fm.date || '',
      project: fm.project || '',
      content,
    });
  }
  
  return posts;
}

// Main
const hidden = collectHidden();
const output = `// Gerado automaticamente por scripts/gen-ocultos.mjs\n// NÃO editar manualmente\n\nexport default ${JSON.stringify(hidden, null, 2)};\n`;
writeFileSync(OUTPUT, output, 'utf-8');
console.log(`gen-ocultos: ${hidden.length} posts hidden → api/ocultos-data.mjs`);