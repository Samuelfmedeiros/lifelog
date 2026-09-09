// Vercel Function: POST /api/liberar
// Libera um post oculto: flipa hidden:true -> hidden:false nos MDX (PT+EN)
// E regenera api/ocultos-data.mjs — TUDO NUM ÚNICO COMMIT (Git Data API).
//
// Por quê: o painel (/ocultos) lê api/ocultos-data.mjs do bundle. Se o commit
// da liberação mexe só no frontmatter, o arquivo de dados fica stale no repo
// e o painel segue listando post já público (bug de 08/09, fix manual 067da21).
// Commit atômico = painel correto no MESMO deploy, sem race de CI.
//
// MODE 1 (planejado, NAO implementado neste arquivo): proxy para o endpoint
//   centralizado do Capivara — POST $LIFELOG_RELEASE_API_URL/api/lifelog/release
//   { slug } com Bearer $LIFELOG_RELEASE_TOKEN.
// MODE 2 (implementado aqui): GitHub Git Data API direta — UM commit atômico
//   com os mdx (PT+EN e variantes) + api/ocultos-data.mjs.
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

// Aceita "slug.mdx", "en/slug.mdx", "src/content/posts/slug.mdx", slug puro.
// RETORNA path relativo a src/content/posts/ SEM extensão, preservando "en/".
function slugFromPath(p) {
  const raw = String(p || '').trim();
  if (!raw) return '';
  const noExt = raw.replace(/\.mdx?$/, '').trim();
  return noExt.replace(/^src\/content\/posts\//, '').replace(/^posts\//, '');
}

// Gemêas EN do repo: maioria = mesmo nome em en/, minoria = prefixo en- no
// arquivo (ex: en/en-lifelog-o-ciclo-do-nao.mdx → data path en/en-...mdx).
// O twin lookup antigo errava a minoria; aqui viram candidatos (try-all).
// Candidato inexistente = no-op seguro (missing) — flip só age em real.
export function twinCandidates(base) {
  if (base.startsWith('en/')) {
    const bare = base.slice(3);
    const pts = bare.startsWith('en-') ? [bare, bare.slice(3)] : [bare];
    return [...new Set(pts)];
  }
  return [...new Set([`en/${base}`, `en/en-${base}`])];
}

// ── MODE 2: commit único via Git Data API ────────────────────────────
// Tenta até 3x; em cada tentativa RE-BUSCA os arquivos frescos do main
// (flip e remoção re-aplicados sobre conteúdo recente — nunca overwrite cego).
async function releaseAtomic(base) {
  if (!process.env.GH_TOKEN) {
    return { status: 500, json: { error: 'GH_TOKEN nao configurado (env da Vercel) — impossivel liberar' } };
  }
  const core = await import('../scripts/ocultos-core.mjs');
  const committer = core.createGithubCommitter({ token: process.env.GH_TOKEN, owner: OWNER, repo: REPO, branch: BRANCH });

  // Par + variantes de nomenclatura (repo tem en/slug.mdx E en/en-slug.mdx).
  const targets = [...new Set([base, ...twinCandidates(base)])];
  const lastError = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    const files = [];          // [{ path, content }] pro commit
    const released = [];       // flips aplicados nesta tentativa
    const already = [];        // já estavam hidden:false
    const missing = [];        // arquivos que não existem (post only-PT/EN)
    // Entrada sai do ocultos-data se o mdx está liberado — flipado AGORA ou já
    // liberado antes (estado meio-liberado de uma liberação anterior quebrada).
    const dataEntryPaths = targets.map((t) => `${t}.mdx`);

    // 1) Re-busca os mdx frescos do main e aplica os flips
    for (const t of targets) {
      const repoPath = `src/content/posts/${t}.mdx`;
      const f = await committer.getFile(repoPath);
      if (!f.present) { missing.push(t); continue; }
      const r = core.flipHidden(f.content);
      if (r.missing) {
        lastError.push({ slug: t, error: 'Post nao esta oculto (hidden nao e true)' });
        continue;
      }
      if (r.flipped) { files.push({ path: repoPath, content: r.raw }); released.push(t); }
      else if (r.already) already.push(t);
    }

    // 2) ocultos-data: remove entradas dos targets a partir do CONTEÚDO do main
    let dataSynced = false;
    const dataFile = await committer.getFile('api/ocultos-data.mjs');
    if (dataFile.present) {
      try {
        const posts = core.parseOcultos(dataFile.content);
        const remaining = core.removePosts(posts, dataEntryPaths);
        if (remaining.length !== posts.length) {
          files.push({ path: 'api/ocultos-data.mjs', content: core.serializeOcultos(remaining) });
        }
        dataSynced = true;
      } catch (e) {
        // data corrompido/parse falhou: commita só os mdx; self-heal do CI regenera
        lastError.push({ error: `ocultos-data parse falhou: ${e.message}` });
      }
    }

    // 3) Nada a fazer → idempotência + CURA do data stale: re-click no par
    //    já liberado — só a entrada do data precisa sair (commit de sync).
    if (files.length === 0) {
      if (already.length > 0 && dataSynced && dataFile?.present) {
        try {
          const cur = core.parseOcultos(dataFile.content);
          const remaining = core.removePosts(cur, dataEntryPaths);
          if (remaining.length !== cur.length) {
            files.push({ path: 'api/ocultos-data.mjs', content: core.serializeOcultos(remaining) });
          }
        } catch {
          // data ilegível → sem cura; self-heal do CI regenera no deploy.
        }
      }
      if (files.length === 0) {
        if (already.length > 0) {
          return { status: 200, json: { ok: true, released: [], already, missing, mode: 'atomic', commit: null, dataSynced } };
        }
        return { status: 422, json: { error: 'Nada foi liberado (todos os arquivos ja estavam liberados ou nao existem)', lastError } };
      }
      // files só tem o data (cura stale) → cai pro commit com message de sync
    }

    // 4) Commit ÚNICO: mdx PT+EN + ocultos-data
    const cureOnly = files.length === 1 && files[0].path === 'api/ocultos-data.mjs';
    const message = cureOnly
      ? `chore(ocultos): sync data pós-liberação de ${base} (stale cure)`
      : `release(post): ${base} (PT+EN + ocultos-data)`;
    try {
      const result = await committer.commitFiles({ message, files });
      return { status: 200, json: { ok: true, released, already, missing, mode: 'atomic', commit: result.commit, dataSynced } };
    } catch (e) {
      if (e.moved) { lastError.push({ error: e.message }); continue; } // main andeu → retry re-buscando conteúdo fresco
      throw e;
    }
  }
  return { status: 502, json: { error: 'Falha apos 3 tentativas (main mudando durante release)', lastError } };
}

export default async function handler(req, res) {
  let check;
  try {
    check = secretOk(req);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
    return;
  }
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

  let result;
  try {
    result = await releaseAtomic(base);
  } catch (e) {
    console.error('liberar: releaseAtomic falhou:', e?.message || e);
    result = { status: 502, json: { error: `Falha na liberacao: ${e?.message || 'erro desconhecido'}` } };
  }
  res.status(result.status).json(result.json);
}
