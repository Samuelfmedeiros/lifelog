#!/usr/bin/env node
// Verifica, contra uma URL real, que os posts ocultos NAO sao publicos.
//
// Uso:
//   ADMIN_SECRET=... node scripts/check-ocultos-gate.mjs https://lifelog.seu.pet
//
// Sem ADMIN_SECRET no ambiente ele roda so os testes negativos (que sao os que
// provam o fechamento). Sai com codigo 1 em qualquer falha.
//
// Contexto (01/11/2026): /ocultos/preview/{pt,en}/<slug>/ era HTML estatico
// publico — o post oculto inteiro, sem segredo. Agora o middleware da raiz
// exige o cookie lifelog_ocultos (HMAC do ADMIN_SECRET).

const base = (process.argv[2] || 'https://lifelog.seu.pet').replace(/\/+$/, '');
const segredo = process.env.ADMIN_SECRET || '';
const slug = process.argv[3] || 'capivara-a-senha-que-o-ci-executava';

let falhas = 0;
function ok(nome, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FALHA'}  ${nome}${extra ? '  -> ' + extra : ''}`);
  if (!cond) falhas++;
}

async function get(path, headers = {}) {
  const res = await fetch(base + path, { headers, redirect: 'manual' });
  const texto = await res.text();
  return { status: res.status, texto, headers: res.headers };
}

const alvos = [`/ocultos/preview/pt/${slug}/`, `/ocultos/preview/en/${slug}/`];

// 1. Sem cookie: nenhuma rota de preview pode devolver o post.
for (const alvo of alvos) {
  const r = await get(alvo);
  const redirecionou = [301, 302, 307, 308].includes(r.status);
  ok(`${alvo} sem sessao nao entrega o post`, redirecionou || r.status === 401 || r.status === 403,
    `status ${r.status}${r.headers.get('location') ? ' -> ' + r.headers.get('location') : ''}`);
  if (redirecionou) {
    const loc = r.headers.get('location') || '';
    ok(`${alvo} manda para o login com next=`, loc.includes('/ocultos/') && loc.includes('next='), loc);
  }
  ok(`${alvo} nao vaza corpo`, !r.texto.includes('data-project') || r.texto.length < 5000,
    `${r.texto.length} bytes`);
}

// 2. O painel de login continua aberto.
const painel = await get('/ocultos/');
ok('/ocultos/ responde 200 (tela de login)', painel.status === 200, `status ${painel.status}`);
ok('/ocultos/ nao entrega corpo de post', !painel.texto.includes('data-project'));

// 3. Segredo errado nao abre sessao.
const errado = await fetch(`${base}/api/session`, {
  method: 'POST',
  headers: { Authorization: 'Bearer segredo-de-teste-errado' },
  redirect: 'manual',
});
ok('/api/session rejeita segredo errado', [401, 500].includes(errado.status), `status ${errado.status}`);

// 4. Com o segredo certo: sessao abre e o preview volta a renderizar.
if (segredo) {
  const login = await fetch(`${base}/api/session`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${segredo}` },
    redirect: 'manual',
  });
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  ok('/api/session abre sessao com o segredo certo', login.status === 200 && cookie.startsWith('lifelog_ocultos='),
    `status ${login.status} cookie ${cookie ? 'presente' : 'AUSENTE'}`);

  if (cookie) {
    const comCookie = await get(alvos[0], { Cookie: cookie });
    ok(`${alvos[0]} com sessao entrega o post`, comCookie.status === 200 && comCookie.texto.includes('data-project'),
      `status ${comCookie.status}, ${comCookie.texto.length} bytes`);
  }
} else {
  console.log('SKIP   teste positivo (defina ADMIN_SECRET no ambiente)');
}

console.log(`\n${falhas === 0 ? 'APTO' : 'REPROVADO'}: ${falhas} falha(s) em ${base}`);
process.exit(falhas === 0 ? 0 : 1);