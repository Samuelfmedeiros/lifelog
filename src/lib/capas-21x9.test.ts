// REGRESSAO 21/9 — capas quadradas (1024x1024) quebraram o card do blog
// (PostCard.astro corta em 21/9). Samuel desaprovou a rodada em 07/11/2026
// e a cura foi o gerador local deterministico scripts/gerar-capas-21x9.py
// (PIL, 2100x900, custo zero de API).
//
// O que este teste travа:
//  1. as capas curadas ficam em 2100x900 (nem quadrada, nem 1376x752);
//  2. nenhuma capa fora de 21/9 pode ser NOVA: o acervo legado listado em
//     public/covers/_aspect-baseline.json nao falha, post/cover novo falha.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const COVERS = join(ROOT, 'public', 'covers');

/** Dimensoes de .webp (RIFF/VP8X/VP8/VP8L) e .avif (ftyp + ispe). */
function dims(abs: string): { w: number; h: number } | null {
  if (!existsSync(abs)) return null;
  const d = readFileSync(abs).subarray(0, 4096);
  if (d.length >= 12 && d[4] === 0x66 && d[5] === 0x74 && d[6] === 0x79 && d[7] === 0x70) {
    const i = d.indexOf(Buffer.from('ispe'));
    if (i < 0 || i + 16 > d.length) return null;
    return { w: d.readUInt32BE(i + 8), h: d.readUInt32BE(i + 12) };
  }
  if (d.length < 30 || d[0] !== 0x52 || d[1] !== 0x49) return null;
  const cc = d.toString('latin1', 12, 16);
  if (cc === 'VP8X') return { w: 1 + d.readUIntLE(24, 3), h: 1 + d.readUIntLE(27, 3) };
  if (cc === 'VP8 ') return { w: d.readUInt16LE(26) & 0x3fff, h: d.readUInt16LE(28) & 0x3fff };
  if (cc === 'VP8L') {
    const b = d[21] | (d[22] << 8) | (d[23] << 16) | (d[24] << 24);
    return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
  }
  return null;
}

function coverOf(dir: string, fn: string): string | null {
  const text = readFileSync(join(dir, fn), 'utf-8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const line = m[1].split('\n').find((l) => l.trim().startsWith('cover:'));
  if (!line) return null;
  const v = line.split(':').slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
  return v.startsWith('/') ? join(ROOT, 'public', v) : join(ROOT, v);
}

function posts(): Array<{ dir: string; fn: string }> {
  const out: Array<{ dir: string; fn: string }> = [];
  for (const dir of [POSTS, join(POSTS, 'en')]) {
    let entries: string[];
    try {
      entries = readdirSync(dir) as string[];
    } catch {
      continue; // diretório en/ pode não existir
    }
    for (const fn of entries.filter((f) => f.endsWith('.mdx'))) out.push({ dir, fn });
  }
  return out;
}

// as 20 capas curadas em 07/11/2026 (a rodada que Samuel desaprovou).
const CURADAS = [
  'a-historia-do-tatuengine',
  'capivara-cresce-dashboard-analytics-e-controle',
  'capivara-hub-pessoal-bagunca-financeira',
  'descobertas-o-botao-que-refazia-posts',
  'lifelog-o-commit-unico',
  'lifelog-tres-concertos-uma-causa',
  'o-ecossistema-hoje',
  'o-teste-que-nao-sabia-dos-posts-ocultos',
  'tatuengine-block-codec-27gb-para-245mb',
  'tatuengine-o-agente-que-pensou-em-loop',
  'tatuengine-operacao-convergencia-mestre-aprendiz',
  'tatuengine-o-retorno-do-lm-head',
  'yurumi-a-config-que-dava-razao-ao-arquivo',
  'yurumi-a-memoria-que-precisava-esquecer',
  'yurumi-a-mensagem-que-saiu-sem-recibo',
  'yurumi-a-mensagem-que-saiu-sem-recibo-v2',
  'yurumi-a-mensagem-que-saiu-sem-recibo-v4',
  'yurumi-o-dry-run-que-gravava',
  'yurumi-o-guard-que-mede-o-resultado',
  'yurumi-o-indice-cego-para-as-proprias-skills',
];

describe('capas 21/9', () => {
  it('cada capa curada existe em 2100x900', () => {
    const faltando: string[] = [];
    const erradas: string[] = [];
    for (const slug of CURADAS) {
      const abs = join(COVERS, `${slug}.webp`);
      if (!existsSync(abs)) {
        faltando.push(slug);
        continue;
      }
      const d = dims(abs);
      if (!d || d.w !== 2100 || d.h !== 900) {
        erradas.push(`${slug}: ${d ? `${d.w}x${d.h}` : 'ilegivel'}`);
      }
    }
    expect({ faltando, erradas }).toEqual({ faltando: [], erradas: [] });
  });

  it('acervo nao tem capa NOVA fora de 21/9 (legado nao falha)', () => {
    const base = JSON.parse(readFileSync(join(COVERS, '_aspect-baseline.json'), 'utf-8')) as {
      legacy?: string[];
      total?: number;
    };
    const legado = new Set((base.legacy || []).map((p) => p.replace(/^\/+/, '')));
    // Baseline VAZIA e' o estado correto quando o acervo inteiro ja foi normalizado
    // (08/11/2026: 54 legadas -> 0). Exigir >0 aqui travava o CI exatamente quando o
    // acervo ficava limpo. O contrato real e': nenhuma capa NOVA fora de 21/9.
    expect(Array.isArray(base.legacy || [])).toBe(true);
    const vistos = new Set<string>();
    for (const p of posts()) {
      const c = coverOf(p.dir, p.fn);
      if (c) vistos.add(c);
    }
    const novas: string[] = [];
    for (const abs of vistos) {
      const rel = relative(ROOT, abs).replace(/^\/+/, '');
      if (legado.has(rel)) continue;
      const d = dims(abs);
      if (!d || d.h === 0 || Math.abs(d.w / d.h - 21 / 9) > 0.05) novas.push(rel);
    }
    expect(novas).toEqual([]);
  });
});
