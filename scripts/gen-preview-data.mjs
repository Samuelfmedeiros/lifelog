#!/usr/bin/env node
// Recolhe os previews de posts ocultos do build e APAGA as paginas estaticas.
//
// Por que (01/11/2026): /ocultos/preview/{pt,en}/<slug>/ era HTML estatico publico
// — qualquer pessoa com o link lia o post oculto inteiro (200, ~55KB), sem segredo.
//
// Como fica: o HTML sai do build e vai para api/preview-data.mjs (bundle da
// function, server-side). O rewrite do vercel.json manda /ocultos/preview/** para
// /api/preview, que exige o cookie de sessao (api/session) e so entao devolve o HTML.
// Se um preview ficar em dist/, a Vercel serve o arquivo ANTES do rewrite — por isso
// a remocao e verificada e o script FALHA se sobrar qualquer coisa.
//
// Roda DEPOIS do astro build (ver package.json -> scripts.build).

import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const DIR_PREVIEW = join(RAIZ, 'dist', 'ocultos', 'preview');
const DESTINO = join(RAIZ, 'api', 'preview-data.mjs');
const IDIOMAS = ['pt', 'en'];

function paginas(lang) {
  const dir = join(DIR_PREVIEW, lang);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((nome) => statSync(join(dir, nome)).isDirectory())
    .map((slug) => ({ lang, slug, arquivo: join(dir, slug, 'index.html') }))
    .filter((p) => existsSync(p.arquivo));
}

const mapa = {};
let total = 0;
for (const lang of IDIOMAS) {
  for (const p of paginas(lang)) {
    mapa[`${p.lang}/${p.slug}`] = readFileSync(p.arquivo, 'utf8');
    total++;
  }
}

if (total === 0) {
  console.error('gen-preview-data: NENHUM preview no build. Confira getStaticPaths dos previews.');
  process.exit(1);
}

const cabecalho = [
  '// GERADO POR scripts/gen-preview-data.mjs — nao editar a mao.',
  '// HTML dos previews de post oculto, servido por api/preview.mjs SO com o cookie',
  '// de sessao (api/session). Estes arquivos NAO existem em dist/: se existissem, a',
  '// Vercel serviria o arquivo estatico antes do rewrite e o post oculto ficaria publico.',
  '',
].join('\n');
writeFileSync(
  DESTINO,
  cabecalho + 'export default ' + JSON.stringify(mapa, null, 0) + ';\n',
  'utf8',
);

const tamanhoKb = Math.round(Buffer.byteLength(readFileSync(DESTINO)) / 1024);
rmSync(DIR_PREVIEW, { recursive: true, force: true });

if (existsSync(DIR_PREVIEW)) {
  console.error('gen-preview-data: dist/ocultos/preview AINDA EXISTE depois da remocao.');
  process.exit(1);
}

const slugs = [...new Set(Object.keys(mapa).map((k) => k.split('/')[1]))];
console.log(
  `gen-preview-data: ${total} preview(s) protegido(s) [${slugs.length} slug(s)] -> api/preview-data.mjs (${tamanhoKb} KB); dist/ocultos/preview removido.`,
);