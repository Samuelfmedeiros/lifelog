#!/usr/bin/env node
/**
 * IndexNow — submete as URLs do sitemap para os buscadores que suportam o
 * protocolo (Bing, Yandex, Seznam, Naver). O Google NAO consome IndexNow.
 *
 * Como funciona: o buscador busca a chave em https://<host>/<chave>.txt para
 * confirmar que quem submete controla o site. O arquivo vive em public/.
 *
 * Uso:
 *   node scripts/indexnow-submit.mjs            # submete tudo do sitemap
 *   node scripts/indexnow-submit.mjs --dry      # so lista as URLs
 *   node scripts/indexnow-submit.mjs --limit 10 # submete as 10 primeiras
 */

const HOST = process.env.INDEXNOW_HOST || 'lifelog-sepia.vercel.app';
const KEY = process.env.INDEXNOW_KEY || '88232e858891487ce38601cfa8976794';
const DRY = process.argv.includes('--dry');
const LIMIT_ARG = process.argv.indexOf('--limit');
const LIMIT = LIMIT_ARG > -1 ? Number(process.argv[LIMIT_ARG + 1]) : 0;
const MAX_PER_CALL = 10000; // limite do protocolo

const SITEMAPS = [`https://${HOST}/sitemap-index.xml`, `https://${HOST}/sitemap.xml`];

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'user-agent': 'lifelog-indexnow/1.0' } });
  if (!res.ok) return null;
  return res.text();
}

/** Coleta URLs dos sitemaps (aceita sitemap-index com <sitemap><loc>). */
async function collectUrls() {
  const seen = new Set();
  const urls = [];

  const add = (loc) => {
    if (!loc || seen.has(loc)) return;
    if (/\/(ocultos|en\/ocultos)\//.test(loc)) return; // preview nunca vai pro buscador
    seen.add(loc);
    urls.push(loc);
  };

  for (const sm of SITEMAPS) {
    const body = await fetchText(sm);
    if (!body) continue;

    const nested = [...body.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    if (nested.length) {
      for (const child of nested) {
        const childBody = await fetchText(child);
        if (!childBody) continue;
        for (const m of childBody.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) add(m[1]);
      }
    } else {
      for (const m of body.matchAll(/<url>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/g)) add(m[1]);
    }
  }
  return LIMIT > 0 ? urls.slice(0, LIMIT) : urls;
}

async function verifyKey() {
  const res = await fetch(`https://${HOST}/${KEY}.txt`, { method: 'HEAD' }).catch(() => null);
  return !!res && res.ok;
}

async function submit(urls) {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: urls,
    }),
  });
  return { status: res.status, text: await res.text().catch(() => '') };
}

(async () => {
  const urls = await collectUrls();
  console.log(`[indexnow] ${urls.length} URLs no sitemap de ${HOST}`);

  if (!urls.length) {
    console.log('[indexnow] nada a submeter (sitemap vazio ou inacessivel)');
    return;
  }
  if (DRY) {
    console.log(urls.slice(0, 10).join('\n'));
    console.log('[indexnow] --dry: nada enviado');
    return;
  }

  const keyOk = await verifyKey();
  if (!keyOk) {
    console.error(`[indexnow] chave nao encontrada em https://${HOST}/${KEY}.txt — submissao abortada`);
    process.exit(1);
  }
  console.log('[indexnow] chave verificada no host');

  let sent = 0;
  for (let i = 0; i < urls.length; i += MAX_PER_CALL) {
    const batch = urls.slice(i, i + MAX_PER_CALL);
    const { status, text } = await submit(batch);
    // 200/202 = aceito; 422 = chave ainda nao verificada pelo buscador
    console.log(`[indexnow] lote ${i / MAX_PER_CALL + 1}: ${batch.length} URLs -> HTTP ${status} ${text}`.trim());
    if (status >= 400) process.exit(1);
    sent += batch.length;
  }
  console.log(`[indexnow] ${sent} URLs submetidas`);
})();
