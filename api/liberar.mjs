// Vercel Function: POST /api/liberar
// Libera um post oculto: flipa hidden:true -> hidden:false no frontmatter do MDX
// e commita via GitHub API (push em main dispara o CI -> deploy).
//
// Libera o PAR PT+EN num unico clique: post do LifeLog e bilingue, e liberar
// so o PT (ou so o EN) deixava a lingua irma presa em hidden:true para sempre.
//
// MODE 1 (novo, preferido): proxy para o endpoint centralizado do Capivara
//   POST $LIFELOG_RELEASE_API_URL/api/lifelog/release  { slug }
//   com Bearer $LIFELOG_RELEASE_TOKEN — o Capivara flipa hidden e commita
//   (PT e EN), com fallback git local quando a GitHub API falha por auth.
// MODE 2 (fallback): se as envs do Capivara não existirem, mantém o
//   comportamento legado: GitHub API direta com GH_TOKEN (flipa PT+EN juntos).
//
// Requer ADMIN_SECRET (env na Vercel) via header Authorization: Bearer ***
import { timingSafeEqual } from 'node:crypto';

const OWNER = 'Samuelfmedeiros';
const REPO = 'lifelog';
const BRANCH = process.env.GH_BRANCH || 'main';
const GITHUB_API = 'https://api.github.com';

const SLUG_RE = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;

function secretOk(req) {
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET) return { ok: false, error: 'ADMIN_SECRET nao configurado (env da Vercel)' };
  const auth = req.headers['authorization'] || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_SECRET);
  if (a.length !== b.length) return { ok: false, error: 'Segredo invalido' };
  return { ok: timingSafeEqual(a, b), error: 'Segredo invalido' };
}

async function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

// Aceita path nos formatos que o /ocultos envia:
//   "slug.mdx", "en/slug.mdx", "src/content/posts/slug.mdx",
//   "src/content/posts/en/slug.mdx", ou slug puro.
// RETORNA o path relativo SEM a extensão, PRESERVANDO o prefixo "en/"
// (ex: "en/slug" ou "slug") — sem isso, liberar um post EN liberaria o PT.
function slugFromPath(p) {
  const raw = String(p || '').trim();
  if (!raw) return '';
  const noExt = raw.replace(/\.mdx?$/, '').trim();
  // remove prefixos redundantes
  return noExt.replace(/^src\/content\/posts\//, '').replace(/^posts\//, '');
}

// ── Modo 2 (legado): GitHub API direta ──────────────────────────────
async function gh(path, opts = {}) {
  const token = process.env.GH_TOKEN;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'lifelog-release',
    ...(opts.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${GITHUB_API}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function flipFile(slug) {
  // Flipa hidden:true -> false de UM arquivo. present=false = arquivo nao existe
  // (post only-PT, por exemplo). Retorna { status, json, present, already }.
  // already=true = arquivo existia mas ja estava hidden:false (release repetida
  // do par irmao) — NAO e erro, e idempotencia.
  if (!process.env.GH_TOKEN) {
    return { status: 500, json: { error: 'GH_TOKEN nao configurado (env da Vercel) — impossivel liberar' }, present: true, already: false };
  }
  const filePath = `src/content/posts/${slug}.mdx`;
  const enc = encodeURIComponent(filePath);
  const getRes = await gh(`/repos/${OWNER}/${REPO}/contents/${enc}?ref=${BRANCH}`);
  if (getRes.status === 404) {
    return { status: 404, json: { error: `Arquivo nao encontrado: ${slug}` }, present: false, already: false };
  }
  if (getRes.status !== 200) {
    return { status: 502, json: { error: `Falha ao ler arquivo no GitHub (${getRes.status})` }, present: true, already: false };
  }
  const { content, sha } = getRes.data;
  const decoded = Buffer.from(content, 'base64').toString('utf-8');

  // Flipa SOMENTE o campo hidden no frontmatter (primeiro bloco --- ---)
  const fmMatch = decoded.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    return { status: 422, json: { error: 'Frontmatter nao encontrado' }, present: true, already: false };
  }
  const fm = fmMatch[1];
  const updatedFm = fm.replace(/^(\s*hidden:\s*)true(\s*)$/m, '$1false$2');
  if (updatedFm === fm) {
    if (/^(\s*hidden:\s*)false(\s*)$/m.test(fm)) {
      return { status: 200, json: { ok: true, slug, already: true }, present: true, already: true };
    }
    return { status: 422, json: { error: 'Post nao esta oculto (hidden nao e true)' }, present: true, already: false };
  }
  const newContent = decoded.replace(fm, updatedFm);
  const newContentB64 = Buffer.from(newContent, 'utf-8').toString('base64');

  const putRes = await gh(`/repos/${OWNER}/${REPO}/contents/${enc}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `release(post): ${slug}`,
      content: newContentB64,
      sha,
      branch: BRANCH,
    }),
  });
  if (putRes.status !== 200 && putRes.status !== 201) {
    return { status: 502, json: { error: `Falha no commit no GitHub (${putRes.status})` }, present: true };
  }
  return { status: 200, json: { ok: true, slug, commit: putRes.data.commit?.sha, mode: 'github' }, present: true };
}

// Libera o PAR PT+EN num unico clique. Post do LifeLog e bilingue; liberar so o
// PT (ou so o EN) deixava a lingua irma presa em hidden:true para sempre.
async function releaseBoth(base) {
  const twin = base.startsWith('en/') ? base.slice(3) : 'en/' + base;
  const targets = [...new Set([base, twin])];
  let released = [];
  let already = [];
  let missing = [];
  let errors = [];
  for (const t of targets) {
    const r = await flipFile(t);
    if (!r.present) missing.push(t);
    else if (r.status === 200 && r.already) already.push(t); // ja estava hidden:false — idempotente
    else if (r.status === 200) released.push(t);
    else errors.push({ slug: t, error: r.json?.error || ('HTTP ' + r.status) });
  }
  if (errors.length > 0) {
    return { status: 502, json: { error: errors[0].error, errors, released } };
  }
  if (released.length > 0 || already.length > 0) {
    // missing = lingua irma inexistente (post only-PT/only-EN) — nao e erro.
    // already = par irmao ja tinha sido liberado junto — NAO e erro (idempotencia).
    return { status: 200, json: { ok: true, released, already, missing, mode: 'github' } };
  }
  return { status: 422, json: { error: 'Nada foi liberado (todos os arquivos ja estavam liberados ou nao existem)' } };
}

export default async function handler(req, res) {
  const check = secretOk(req);
  if (!check.ok) {
    res.status(401).json({ error: check.error || 'Segredo invalido' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo nao permitido' });
    return;
  }
  const body = await readBody(req);
  const base = slugFromPath(body.path || body.slug);
  if (!base || !SLUG_RE.test(base)) {
    res.status(400).json({ error: 'path/slug invalido' });
    return;
  }

  const result = await releaseBoth(base);
  res.status(result.status).json(result.json);
}