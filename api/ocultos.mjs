// Vercel Function: GET /api/ocultos
// Lista posts ocultos (hidden: true) direto do filesystem do deploy.
// Requer ADMIN_SECRET (env na Vercel) via header Authorization: Bearer <secret>.
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '../src/content/posts');

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

function parseFrontmatter(raw) {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return { hidden: false, title: '', date: '', project: '', lang: 'pt' };
  const fm = fmMatch[1];
  const get = (key) => {
    const line = fm.split('\n').find((l) => l.trim().startsWith(key + ':'));
    if (!line) return '';
    return line.split(':').slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
  };
  return {
    hidden: /^\s*hidden:\s*true\s*$/m.test(fm),
    title: get('title'),
    date: get('date'),
    project: get('project'),
    lang: get('lang') || 'pt',
  };
}

async function collectHidden(dir, langPrefix) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const out = [];
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    if (e.isDirectory()) continue;
    if (!e.name.endsWith('.mdx') && !e.name.endsWith('.md')) continue;
    const abs = path.join(dir, e.name);
    const raw = await readFile(abs, 'utf-8').catch(() => '');
    if (!raw) continue;
    const meta = parseFrontmatter(raw);
    if (!meta.hidden) continue;
    const relPath = langPrefix ? `${langPrefix}/${e.name}` : e.name;
    out.push({
      path: relPath,
      slug: e.name.replace(/\.mdx?$/, ''),
      lang: meta.lang,
      title: meta.title,
      date: meta.date,
      project: meta.project,
      content: raw.slice(0, 30000),
    });
  }
  return out;
}

export default async function handler(req, res) {
  const check = secretOk(req);
  if (!check.ok) {
    res.status(401).json({ error: check.error || 'Segredo invalido' });
    return;
  }
  const posts = [
    ...(await collectHidden(POSTS_DIR, '')),
    ...(await collectHidden(path.join(POSTS_DIR, 'en'), 'en')),
  ];
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true, posts });
}
