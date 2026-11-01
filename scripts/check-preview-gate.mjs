#!/usr/bin/env node
// Prova local do gate do preview de post oculto.
//
// Sobe um servidor que imita o roteamento do vercel.json (rewrite
// /ocultos/preview/:lang/:slug[/] -> /api/preview?lang=&slug=) e chama as
// functions reais (api/session.mjs, api/preview.mjs) com o ADMIN_SECRET de teste.
//
// O que ele NAO prova: que a Vercel aplica o rewrite. Isso roda em producao e e
// conferido por scripts/check-ocultos-gate.mjs (curl na URL publica).
//
// Uso: node scripts/check-preview-gate.mjs   (precisa de api/preview-data.mjs, que
// sai do build — rode `pnpm build` antes).

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = process.cwd();
const DADOS = join(RAIZ, 'api', 'preview-data.mjs');
const SEGREDO = 'segredo-de-teste-nao-e-o-de-producao';
process.env.ADMIN_SECRET = SEGREDO;

if (!existsSync(DADOS)) {
  console.error('FALHA  api/preview-data.mjs nao existe — rode `pnpm build` antes.');
  process.exit(1);
}

const preview = (await import(pathToFileURL(join(RAIZ, 'api', 'preview.mjs')).href)).default;
const session = (await import(pathToFileURL(join(RAIZ, 'api', 'session.mjs')).href)).default;
const mapa = (await import(pathToFileURL(DADOS).href)).default;

let falhas = 0;
function ok(nome, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FALHA'}  ${nome}${extra ? '  -> ' + extra : ''}`);
  if (!cond) falhas++;
}

// Shim minimo de req/res estilo Vercel Node runtime
function resFalso() {
  const st = { status: 200, headers: {}, corpo: '' };
  return {
    st,
    setHeader(k, v) { st.headers[k.toLowerCase()] = v; },
    writeHead(code, headers = {}) {
      st.status = code;
      for (const [k, v] of Object.entries(headers)) st.headers[k.toLowerCase()] = v;
    },
    status(code) { st.status = code; return this; },
    send(body) { st.corpo = body; return this; },
    json(obj) { st.headers['content-type'] = 'application/json'; st.corpo = JSON.stringify(obj); return this; },
    end(body) { if (body) st.corpo = body; },
  };
}

async function chamar(handler, { url, cookie, method = 'GET' }) {
  const u = new URL(url, 'http://teste.local');
  const req = {
    method,
    url,
    headers: { cookie: cookie || '', authorization: `Bearer ${process.env.__TOKEN || ''}` },
    query: Object.fromEntries(u.searchParams),
  };
  const res = resFalso();
  await handler(req, res);
  return res.st;
}

const umSlug = Object.keys(mapa)[0];
const [lang, slug] = umSlug.split('/');
const caminho = `/ocultos/preview/${lang}/${slug}/`;

// 1. Segredo errado nao abre sessao
const semSessao = await chamar(session, { url: '/api/session', method: 'POST' });
ok('/api/session sem Bearer = 401', semSessao.status === 401, `status ${semSessao.status}`);

process.env.__TOKEN = 'segredo-errado';
const errado = await chamar(session, { url: '/api/session', method: 'POST' });
ok('/api/session com segredo errado = 401', errado.status === 401, `status ${errado.status}`);

// 2. Sem cookie, o preview NAO entrega o post
const semCookie = await chamar(preview, { url: `/api/preview?lang=${lang}&slug=${slug}` });
ok('preview sem cookie = 307', semCookie.status === 307, `status ${semCookie.status}`);
ok(
  'preview sem cookie manda para o login com next=',
  (semCookie.headers.location || '').includes('/ocultos/') &&
    (semCookie.headers.location || '').includes('next='),
  semCookie.headers.location,
);
ok('preview sem cookie nao tem corpo', !String(semCookie.corpo).includes('data-project'));

// 3. Cookie forjado nao passa
const forjado = await chamar(preview, {
  url: `/api/preview?lang=${lang}&slug=${slug}`,
  cookie: 'lifelog_ocultos=deadbeef',
});
ok('preview com cookie forjado = 307', forjado.status === 307, `status ${forjado.status}`);

// 4. Segredo certo abre sessao e o preview entrega
process.env.__TOKEN = SEGREDO;
const login = await chamar(session, { url: '/api/session', method: 'POST' });
const setCookie = login.headers['set-cookie'] || '';
const cookie = String(setCookie).split(';')[0];
ok('/api/session com segredo certo = 200 + cookie', login.status === 200 && cookie.startsWith('lifelog_ocultos='), `status ${login.status}`);
ok('cookie e HttpOnly + Secure + SameSite=Strict', /HttpOnly/i.test(setCookie) && /Secure/i.test(setCookie) && /SameSite=Strict/i.test(setCookie));
ok('cookie nao contem o segredo', !String(setCookie).includes(SEGREDO));

const comCookie = await chamar(preview, { url: `/api/preview?lang=${lang}&slug=${slug}`, cookie });
ok('preview com cookie de sessao = 200', comCookie.status === 200, `status ${comCookie.status}`);
ok('preview entregue tem o post renderizado', String(comCookie.corpo).includes('data-project') && String(comCookie.corpo).length > 5000, `${String(comCookie.corpo).length} bytes`);
ok('preview entregue leva noindex', /noindex/i.test(comCookie.headers['x-robots-tag'] || '') || /name="robots"[^>]*noindex/i.test(String(comCookie.corpo)));

// 5. Slug inexistente com sessao = 404 (nao vaza existencia)
const inexistente = await chamar(preview, { url: `/api/preview?lang=${lang}&slug=nao-existe`, cookie });
ok('slug inexistente com cookie = 404', inexistente.status === 404, `status ${inexistente.status}`);

// 6. Todo preview do bundle responde 200 com o cookie (nenhum quebrado)
let ruins = [];
for (const chave of Object.keys(mapa)) {
  const [l, s] = chave.split('/');
  const r = await chamar(preview, { url: `/api/preview?lang=${l}&slug=${s}`, cookie });
  if (r.status !== 200 || !String(r.corpo).includes('data-project')) ruins.push(chave);
}
ok(`os ${Object.keys(mapa).length} previews do bundle respondem com sessao`, ruins.length === 0, ruins.join(', '));

// 7. O HTML guardado nao pode existir tambem em dist/ — se existir, a Vercel
//    serve o arquivo estatico ANTES do rewrite e o post oculto volta a ser publico.
ok('dist/ocultos/preview nao existe no build', !existsSync(join(RAIZ, 'dist', 'ocultos', 'preview')));

// 8. O preview PT guardado aponta para a contraparte EN do mesmo slug (o botao de
//    idioma do preview; era o que o e2e de lang-switch cobria quando a pagina era estatica)
const chavePt = Object.keys(mapa).find((k) => k.startsWith('pt/'));
const chaveEn = chavePt ? 'en/' + chavePt.split('/')[1] : null;
if (chavePt && chaveEn && mapa[chaveEn]) {
  const esperado = new RegExp(`href="/ocultos/preview/en/${chavePt.split('/')[1]}/"`);
  ok('preview PT linka a contraparte EN com o mesmo slug', esperado.test(String(mapa[chavePt])));
} else {
  console.log('SKIP  par PT/EN completo para conferir o botao de idioma');
}

console.log(`\n${falhas === 0 ? 'APTO' : 'REPROVADO'}: ${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);