#!/usr/bin/env node
// check-content-leakage.mjs — GATE DE PUBLICACAO (auditoria 12/09 — posts build-in-public)
// Bloqueia publicar post de PROJETO que entrega receita tecnica proprietaria (TatuEngine, etc).
// Uso: node scripts/check-content-leakage.mjs          (scan completo)
//      node scripts/check-content-leakage.mjs --diff   (so posts novos/mudados vs origin/main)
// Exit 1 = hits proibidos. Exit 0 = limpo.
// CI usa --diff: rigidez total sobre posts NOVOS/MUDADOS (o pedido de 12/09: "proximas postagens").
// Rodada sem flag = inventario completo (ache legado pra sanitizar por lote).
// Regra de autoria que este gate faz cumprir:
//   metrica de engine => ordem de grandeza | codigo => descricao conceitual | nome interno => nunca.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const POSTS_DIR = 'src/content/posts';
const EXEMPT = ['lifelog-content-security.md'];

// Cada regra: [id, regex, motivo]
const RULES = [
  ['kernel-interno', /\b(warp shuffle|warp reduction|shared[- ]memory (accumulator|acumulador)|mem[oó]ria compartilhada|redu[çc][ãa]o via warp)\b/i, 'descreve kernel GPU interno — vira descricao conceitual'],
  ['cuda-explicito', /\b(cada thread processa|thread por (linha|bloco)|block[- ]?traversal kernel|kernel CUDA de travessia|threads\/CTA)\b/i, 'detalhe de implementacao CUDA — vira conceitual'],
  ['formula-receita', /\b(expf\(|log1pf\(|log\(1 ?\+ ?exp)/i, 'formula numerica de fix — receita'],
  ['valor-tuning', /\b(state_lr_scale|lr=3e-5|lr = 3e-5|eps=\(None|base_lrs\s*=\s*\[args)/i, 'valor/receita de tuning de treino'],
  ['benchmark-speedup', /\b(252|146)\s?[×x]\b|\b10\.552\s?ms\b|\b0\.52\s?ms\b|\b41\.9\s?[µu]s\b/i, 'numero exato de speedup — vira ordem de grandeza (ratio de compressao do codec e headline publico, esta no titulo do post e liberado)'],
  ['mse-tensor', /\bMSE 0?\.\d|\b3\.7e-0?9\b/i, 'MSE por tensor exposto'],
  ['nome-arquivo-interno', /\b(bitmamba_1b[a-z_]*\.pt|bitmamba_1b_lmfix|run_fase4\.py|MODEL_PT\s*=|models\/bitmamba[a-z_]*)\b/i, 'nome de arquivo/constante interna do repo'],
  ['optix-interno', /\b(libnvoptix|optixInit|OPTIX_ERROR[A-Z_]*)\b/i, 'detalhe interno da pilha OptiX (a narrativa existe sem o nome tecnico)'],
  ['arvore-src', /\bsrc\/(core|rt|mamba|field_theory)\b/i, 'arvore de diretorios do engine'],
  ['sha-commit', /\bgit (log --oneline -1|show) [0-9a-f]{7,40}\b|\b[0-9a-f]{7,40} fix:|(?<![\w-])[0-9a-f]{7}(?![\w-])\s+(commit|fix)/i, 'SHA de commit interno — vira "o commit do fix"'],
  ['segredo-mascara', /hide_dotdirs\s*=\s*\[\s*["'`]\.[a-z]/i, 'value real do dir protegido — mostra ONDE estao os tokens'],
  ['caminho-credencial', /~\/\.[a-z]+\/(secrets|\.env|credentials)/i, 'caminho real de arquivo de credencial'],
];

function projectOf(txt) {
  const m = txt.match(/^project:\s*([a-z0-9_-]+)/im);
  return m ? m[1] : null;
}
const PERSONAL = new Set(['pessoal', 'lifelog', 'musica', 'familia', '']);

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (EXEMPT.some(x => p.endsWith(x))) continue;
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(mdx?|md)$/.test(p)) yield p;
  }
}

function changedPosts() {
  try {
    const out = execSync(`git diff --name-only origin/main -- ${POSTS_DIR}`, { encoding: 'utf8' });
    return new Set(out.trim().split('\n').filter(Boolean));
  } catch { return null; }
}

let hits = 0, scanned = 0;
const diffOnly = process.argv.includes('--diff');
const changed = diffOnly ? changedPosts() : null;

for (const file of walk(POSTS_DIR)) {
  if (changed && !changed.has(file)) continue;
  const txt = readFileSync(file, 'utf8');
  const proj = projectOf(txt);
  if (proj === null || PERSONAL.has(proj)) continue; // so posts de projeto
  scanned++;
  txt.split('\n').forEach((ln, i) => {
    for (const [id, re, why] of RULES) {
      if (re.test(ln)) {
        console.error(`LEAKAGE [${id}] ${relative('.', file)}:${i + 1}: ${ln.trim().slice(0, 110)}`);
        console.error(`          -> ${why}`);
        hits++;
        break;
      }
    }
  });
}

if (hits) {
  console.error(`\n✖ GATE DE VAZAMENTO: ${hits} hit(s) em ${scanned} post(s) de projeto.`);
  console.error('  Regra: build-in-public conta a historia; a receita fica no cofre.');
  console.error('  Metrica => ordem de grandeza. Codigo => descricao conceitual. Nome interno => nunca.');
  process.exit(1);
}
console.log(`✔ GATE DE VAZAMENTO: limpo (${scanned} post(s) de projeto verificados${diffOnly ? ' no diff' : ''}).`);
