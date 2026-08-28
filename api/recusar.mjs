// Vercel Function: POST /api/recusar
// Recusa um post oculto com nota de feedback — o que quer que mude ou refaça.
// A nota é persistida em 3 vias:
//   1. GitHub Issue no repo lifelog (rastreável, visível pro pipeline)
//   2. Arquivo docs/recusas/<slug>.md commitado no repo (fallback silencioso)
//   3. Notificação via Telegram (alert-dispatcher, se disponível)
//
// Requer ADMIN_SECRET (env na Vercel) via header Authorization: Bearer ***
import { timingSafeEqual } from 'node:crypto';

const OWNER = 'Samuelfmedeiros';
const REPO = 'lifelog';
const BRANCH = process.env.GH_BRANCH || 'main';
const GITHUB_API = 'https://api.github.com';

const SLUG_RE = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/;
const MAX_NOTA = 2000;

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

// Sanitiza a nota: escapa HTML, remove quebra de frontmatter e limita tamanho
function sanitizeNota(text) {
  let s = String(text || '').trim();
  // Limita tamanho
  s = s.slice(0, MAX_NOTA);
  // Escapa HTML básico (nunca vai cru pro frontend mas segurança em dobro)
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Remove bloco frontmatter (--- ... ---) — previne injeção de hidden:false
  s = s.replace(/^---[\s\S]*---/gm, '[frontmatter removido]');
  // Remove caracteres de controle exceto \n
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return s;
}

function slugFromPath(p) {
  const raw = String(p || '').trim();
  if (!raw) return '';
  const noExt = raw.replace(/\.mdx?$/, '').trim();
  return noExt.replace(/^src\/content\/posts\//, '').replace(/^posts\//, '');
}

// ── Via 1: GitHub Issue ──────────────────────────────────────────
async function createIssue(slug, nota) {
  if (!process.env.GH_TOKEN) return { ok: false, error: 'GH_TOKEN nao configurado' };
  const title = `♻️ Refazer: ${slug}`;
  const body = [
    `## Post recusado: \`${slug}\``,
    '',
    '**Nota de recusa:**',
    '',
    '```',
    nota,
    '```',
    '',
    '---',
    '_Gerado automaticamente pelo /api/recusar_',
  ].join('\n');
  try {
    const res = await fetch(`${GITHUB_API}/repos/${OWNER}/${REPO}/issues`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        'User-Agent': 'lifelog-refazer',
      },
      body: JSON.stringify({ title, body, labels: ['refazer'] }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status !== 201) return { ok: false, error: `GitHub API: ${res.status}`, data };
    return { ok: true, issue_url: data.html_url, issue_number: data.number };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Via 2: Arquivo no repo ───────────────────────────────────────
async function commitNotaFile(slug, nota) {
  if (!process.env.GH_TOKEN) return { ok: false, error: 'GH_TOKEN nao configurado' };
  const filePath = `docs/recusas/${slug}.md`;
  const enc = encodeURIComponent(filePath);
  const content = [
    `# Recusa: ${slug}`,
    '',
    '**Data:** ' + new Date().toISOString(),
    '',
    '**Nota:**',
    '',
    nota,
    '',
    '---',
    '_Gerado automaticamente pelo /api/recusar_',
  ].join('\n');
  const contentB64 = Buffer.from(content, 'utf-8').toString('base64');

  // Tenta ler arquivo existente (pra obter sha)
  let sha = null;
  try {
    const getRes = await fetch(`${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${enc}?ref=${BRANCH}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        'User-Agent': 'lifelog-refazer',
      },
    });
    if (getRes.status === 200) {
      const getData = await getRes.json();
      sha = getData.sha;
    }
  } catch {}

  const putBody = {
    message: `refazer: recusa de ${slug}`,
    content: contentB64,
    branch: BRANCH,
  };
  if (sha) putBody.sha = sha;

  try {
    const res = await fetch(`${GITHUB_API}/repos/${OWNER}/${REPO}/contents/${enc}`, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${process.env.GH_TOKEN}`,
        'User-Agent': 'lifelog-refazer',
      },
      body: JSON.stringify(putBody),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status !== 200 && res.status !== 201) return { ok: false, error: `GitHub API: ${res.status}` };
    return { ok: true, path: filePath, commit: data.commit?.sha };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Via 3: Notificação (via GitHub Actions ou log) ───────────────
// Commitamos um arquivo de fila que o pipeline cron pode ler.
// O pipeline cron (15min) verifica docs/recusas/ e dispara refazer.
// Isso já é coberto pela via 2 — a notificação direta fica pra um
// futuro webhook. Por enquanto, a via 2 (arquivo) + via 1 (issue)
// já cobrem o pipeline detectar.

// ── Rate limiter simples (em memória) ─────────────────────────────
// NOTA: em cold start esse mapa é resetado. Para produção real,
// ideal seria Vercel KV. Mas pra uso pessoal (Samuel), resetar
// em cold start é aceitável — o tráfego é 1 pessoa.
const rateMap = new Map();
const RATE_WINDOW = 30_000; // 30s
const RATE_MAX = 3;

function checkRate(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW;
  }
  entry.count++;
  rateMap.set(ip, entry);
  return entry.count <= RATE_MAX;
}

export default async function handler(req, res) {
  // CORS básico (necessário pro frontend)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // Auth
  const check = secretOk(req);
  if (!check.ok) {
    res.status(401).json({ error: check.error || 'Segredo invalido' });
    return;
  }

  // Rate limit
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRate(ip)) {
    res.status(429).json({ error: 'Muitas requisicoes. Aguarde 30s.' });
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
  const nota = sanitizeNota(body.nota || '');
  if (!nota) {
    res.status(400).json({ error: 'Nota de recusa vazia' });
    return;
  }

  // Persistir em todas as vias
  const results = {};
  const errors = [];

  // Via 1: GitHub Issue
  const issue = await createIssue(base, nota);
  results.issue = issue.ok ? { ok: true, url: issue.issue_url } : { ok: false, error: issue.error };
  if (!issue.ok) errors.push(`issue: ${issue.error}`);

  // Via 2: Arquivo docs/recusas/
  const file = await commitNotaFile(base, nota);
  results.file = file.ok ? { ok: true, path: file.path } : { ok: false, error: file.error };
  if (!file.ok) errors.push(`file: ${file.error}`);

  // Via 3: via 2 + issue já cobrem; futuramente notificar webhook aqui

  res.status(200).json({
    ok: true,
    slug: base,
    nota_length: nota.length,
    issue: results.issue,
    file: results.file,
    errors: errors.length > 0 ? errors : undefined,
    message: 'Recusa registrada. O pipeline refaz o post em breve (15min).',
  });
}