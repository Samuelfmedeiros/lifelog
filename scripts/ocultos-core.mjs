// scripts/ocultos-core.mjs — Fonte única de formato + coreografia Git Data API
// Consumidores: scripts/gen-ocultos.mjs (build) e api/liberar.mjs (release atômico).
// Garante que o arquivo gerado no build e o reconstruído no release tenham o
// MESMO formato byte-idêntico (round-trip testado em unit).
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
export const POSTS_DIR = join(ROOT, 'src', 'content', 'posts');
export const DATA_PATH = join(ROOT, 'api', 'ocultos-data.mjs');

const DATA_HEADER = '// Gerado automaticamente por scripts/gen-ocultos.mjs\n// NÃO editar manualmente\n\n';

// ── Formato (parse + serialize byte-idênticos ao gerador) ────────────
export function serializeOcultos(posts) {
  return `${DATA_HEADER}export default ${JSON.stringify(posts, null, 2)};\n`;
}

export function parseOcultos(text) {
  const marker = 'export default ';
  const start = text.indexOf(marker);
  if (start === -1) throw new Error('ocultos-data sem "export default"');
  const body = text.slice(start + marker.length).replace(/;\s*$/, '');
  return JSON.parse(body);
}

// Flipa hidden:true -> false no frontmatter. Preserva CRLF/LF como está.
// Retorna { text, flipped, already } — already = já estava false.
export function flipHidden(raw) {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return { raw, flipped: false, already: false, missing: true };
  const fm = fmMatch[1];
  const updated = fm.replace(/^(\s*hidden:\s*)true(\s*)$/m, '$1false$2');
  if (updated !== fm) return { raw: raw.replace(fm, updated), flipped: true, already: false };
  if (/^(\s*hidden:\s*)false(\s*)$/m.test(fm)) return { raw, flipped: false, already: true };
  return { raw, flipped: false, already: false, missing: true };
}

// Remove entradas cujo path está na lista (PT+EN do par liberado).
// path no data é relativo a src/content/posts/ (ex: "slug.mdx", "en/slug.mdx").
export function removePosts(posts, relPaths) {
  const drop = new Set(relPaths);
  return posts.filter((p) => !drop.has(p.path));
}

// ── Coleta (usada pelo gen-ocultos no build) ─────────────────────────
function parseFrontmatter(raw) {
  const fm = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^(\w+):\s*(.+)/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      }
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      fm[m[1]] = val;
    }
  }
  return fm;
}

function walkDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full));
    else if (entry.isFile() && extname(entry.name) === '.mdx') files.push(full);
  }
  return files;
}

export function collectHidden() {
  const posts = [];
  for (const file of walkDir(POSTS_DIR)) {
    const raw = readFileSync(file, 'utf-8');
    const fm = parseFrontmatter(raw);
    if (!fm.hidden) continue;
    const rel = relative(POSTS_DIR, file).split(/[/\\]/).join('/');
    const parts = rel.split('/');
    const lang = parts.length > 1 && parts[0] === 'en' ? 'en' : 'pt';
    const slug = (lang === 'en' ? parts.slice(1) : parts).join('/').replace(/\.mdx$/, '');
    const contentStart = raw.indexOf('---', 3);
    const content = contentStart !== -1 ? raw.slice(contentStart + 3).trim().slice(0, 30000) : '';
    posts.push({ path: rel, slug, lang, title: fm.title || slug, date: fm.pubDate || fm.date || '', project: fm.project || '', content });
  }
  return posts;
}

export function regenerateDataFile() {
  const hidden = collectHidden();
  writeFileSync(DATA_PATH, serializeOcultos(hidden), 'utf-8');
  return hidden.length;
}

// ── Coreografia Git Data API (commit atômico multi-arquivo) ─────────
// Docs: https://docs.github.com/en/rest/git (blobs/tree/commits/refs)
// Sequência: ref → commit → base_tree → blobs → tree(base_tree) → commit(parents) → PATCH ref
export function createGithubCommitter({ token, owner, repo, branch = 'main', apiBase = 'https://api.github.com' }) {
  async function gh(path, opts = {}) {
    const res = await fetch(`${apiBase}${path}`, {
      ...opts,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'lifelog-release-atomic',
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }

  async function createTree(baseTree, files) {
    const r = await gh(`/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTree,
        tree: files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', sha: f.blobSha })),
      }),
    });
    if (r.status !== 201) throw Object.assign(new Error(`create tree HTTP ${r.status}`), { status: r.status, data: r.data });
    return r.data.sha;
  }

  return {
    // UM attempt: ref → base tree → blobs → tree → commit → PATCH ref.
    // 422 no PATCH (main andeu) NÃO é re-tentado aqui: o chamador re-busca
    // os conteúdos frescos e refaz, pra nunca sobrescrever commit alheio.
    async commitFiles({ message, files }) {
      const ref = await gh(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
      if (ref.status !== 200) throw Object.assign(new Error(`ref HTTP ${ref.status}`), { status: ref.status });
      const baseSha = ref.data.object.sha;

      const baseCommit = await gh(`/repos/${owner}/${repo}/git/commits/${baseSha}`);
      if (baseCommit.status !== 200) throw Object.assign(new Error(`base commit HTTP ${baseCommit.status}`), { status: baseCommit.status });
      const baseTree = baseCommit.data.tree.sha;

      const blobs = [];
      for (const f of files) {
        const b = await gh(`/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({ content: f.content, encoding: 'utf-8' }),
        });
        if (b.status !== 201) throw Object.assign(new Error(`blob ${f.path} HTTP ${b.status}`), { status: b.status });
        blobs.push({ path: f.path, blobSha: b.data.sha });
      }

      const treeSha = await createTree(baseTree, blobs);
      const commit = await gh(`/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        body: JSON.stringify({ message, tree: treeSha, parents: [baseSha] }),
      });
      if (commit.status !== 201) throw Object.assign(new Error(`commit HTTP ${commit.status}`), { status: commit.status });

      const patch = await gh(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.data.sha, force: false }),
      });
      if (patch.status !== 200) {
        throw Object.assign(new Error(`ref update HTTP ${patch.status}`), { status: patch.status, moved: patch.status === 422 });
      }
      return { commit: commit.data.sha, tree: treeSha, base: baseSha };
    },

    async getFile(path, ref = branch) {
      const r = await gh(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${ref}`);
      if (r.status === 404) return { present: false };
      if (r.status !== 200) throw Object.assign(new Error(`contents ${path} HTTP ${r.status}`), { status: r.status });
      return { present: true, sha: r.data.sha, content: Buffer.from(r.data.content, 'base64').toString('utf-8') };
    },
  };
}
