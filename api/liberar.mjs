// Vercel Function: POST /api/liberar
// Libera um post oculto: flipa hidden:true -> hidden:false no frontmatter do MDX
// e commita via GitHub API (push em main dispara o CI -> deploy).
// Requer ADMIN_SECRET + GH_TOKEN (envs na Vercel).
import { timingSafeEqual } from 'node:crypto';

const OWNER = 'Samuelfmedeiros';
const REPO = 'lifelog';
const BRANCH = process.env.GH_BRANCH || 'main';
const GITHUB_API = 'https://api.github.com';

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
  const filePath = String(body.path || '').trim();
  if (!filePath || !filePath.endsWith('.mdx')) {
    res.status(400).json({ error: 'path invalido' });
    return;
  }
  // Seguranca: so aceita caminhos dentro de src/content/posts
  if (!filePath.startsWith('src/content/posts/')) {
    res.status(400).json({ error: 'path fora de src/content/posts' });
    return;
  }
  if (!process.env.GH_TOKEN) {
    res.status(500).json({ error: 'GH_TOKEN nao configurado (env da Vercel) — impossivel liberar' });
    return;
  }

  const enc = encodeURIComponent(filePath);
  const getRes = await gh(`/repos/${OWNER}/${REPO}/contents/${enc}?ref=${BRANCH}`);
  if (getRes.status !== 200) {
    res.status(502).json({ error: `Falha ao ler arquivo no GitHub (${getRes.status})` });
    return;
  }
  const { content, sha } = getRes.data;
  const decoded = Buffer.from(content, 'base64').toString('utf-8');

  // Flipa SOMENTE o campo hidden no frontmatter (primeiro bloco --- ---)
  const fmMatch = decoded.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    res.status(422).json({ error: 'Frontmatter nao encontrado' });
    return;
  }
  const fm = fmMatch[1];
  const updatedFm = fm.replace(/^(\s*hidden:\s*)true(\s*)$/m, '$1false$2');
  if (updatedFm === fm) {
    res.status(422).json({ error: 'Post nao esta oculto (hidden nao e true)' });
    return;
  }
  const newContent = decoded.replace(fm, updatedFm);
  const newContentB64 = Buffer.from(newContent, 'utf-8').toString('base64');

  const putRes = await gh(`/repos/${OWNER}/${REPO}/contents/${enc}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `release(post): ${filePath.split('/').pop().replace(/\.mdx$/, '')}`,
      content: newContentB64,
      sha,
      branch: BRANCH,
    }),
  });
  if (putRes.status !== 200 && putRes.status !== 201) {
    res.status(502).json({ error: `Falha no commit no GitHub (${putRes.status})` });
    return;
  }
  res.status(200).json({ ok: true, commit: putRes.data.commit?.sha });
}
